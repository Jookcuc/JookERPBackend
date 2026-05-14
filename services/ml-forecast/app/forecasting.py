from __future__ import annotations

from datetime import timedelta
from math import sqrt

import numpy as np
import pandas as pd
from prophet import Prophet

from app.schemas import (
    DemandPoint,
    ForecastMetrics,
    ForecastPoint,
    ForecastProductRequest,
    ProductForecastResponse,
)


MODEL_NAME = "prophet"
MODEL_DESCRIPTION = (
    "Prophet time-series model trained per product from historical sales invoices."
)
MIN_TRAINING_POINTS = 14
MIN_ACTIVE_DEMAND_DAYS = 2


class ForecastingService:
    def forecast_product(
        self,
        product: ForecastProductRequest,
        forecast_days: int,
        interval_width: float,
    ) -> ProductForecastResponse:
        history = sorted(product.history, key=lambda point: point.date)
        historical_total = round(sum(point.quantity for point in history), 2)
        active_demand_days = sum(1 for point in history if point.quantity > 0)

        if (
            len(history) < MIN_TRAINING_POINTS
            or active_demand_days < MIN_ACTIVE_DEMAND_DAYS
            or historical_total <= 0
        ):
            return self._baseline_forecast(
                product=product,
                history=history,
                forecast_days=forecast_days,
                active_demand_days=active_demand_days,
                historical_total=historical_total,
                model_used="insufficient_history",
            )

        try:
            training_frame = pd.DataFrame(
                {
                    "ds": [point.date.isoformat() for point in history],
                    "y": [point.quantity for point in history],
                }
            )

            model = Prophet(
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=len(history) >= 365,
                interval_width=interval_width,
            )
            model.fit(training_frame)

            future = model.make_future_dataframe(
                periods=forecast_days,
                freq="D",
                include_history=False,
            )
            prediction = model.predict(future)
            fitted = model.predict(training_frame)
            metrics = self._build_metrics(
                actual=training_frame["y"].to_numpy(),
                predicted=fitted["yhat"].to_numpy(),
                training_points=len(history),
                active_demand_days=active_demand_days,
                historical_total=historical_total,
            )

            forecast_points = [
                ForecastPoint(
                    date=row.ds.date(),
                    predictedQuantity=self._round_non_negative(row.yhat),
                    lowerBound=self._round_non_negative(row.yhat_lower),
                    upperBound=self._round_non_negative(row.yhat_upper),
                )
                for row in prediction.itertuples(index=False)
            ]
        except Exception:
            return self._baseline_forecast(
                product=product,
                history=history,
                forecast_days=forecast_days,
                active_demand_days=active_demand_days,
                historical_total=historical_total,
                model_used="prophet_failed_baseline",
            )

        return ProductForecastResponse(
            productId=product.productId,
            productCode=product.productCode,
            productName=product.productName,
            modelUsed=MODEL_NAME,
            forecast=forecast_points,
            metrics=metrics,
        )

    def _baseline_forecast(
        self,
        product: ForecastProductRequest,
        history: list[DemandPoint],
        forecast_days: int,
        active_demand_days: int,
        historical_total: float,
        model_used: str,
    ) -> ProductForecastResponse:
        last_date = history[-1].date
        baseline = self._weighted_average([point.quantity for point in history])
        daily_std = float(np.std([point.quantity for point in history]))
        forecast_points = []

        for index in range(forecast_days):
            forecast_points.append(
                ForecastPoint(
                    date=last_date + timedelta(days=index + 1),
                    predictedQuantity=self._round_non_negative(baseline),
                    lowerBound=self._round_non_negative(baseline - daily_std),
                    upperBound=self._round_non_negative(baseline + daily_std),
                )
            )

        confidence = "sin_historial" if historical_total <= 0 else "baja"

        return ProductForecastResponse(
            productId=product.productId,
            productCode=product.productCode,
            productName=product.productName,
            modelUsed=model_used,
            forecast=forecast_points,
            metrics=ForecastMetrics(
                trainingPoints=len(history),
                activeDemandDays=active_demand_days,
                historicalTotal=historical_total,
                mae=None,
                rmse=None,
                confidence=confidence,
            ),
        )

    def _build_metrics(
        self,
        actual: np.ndarray,
        predicted: np.ndarray,
        training_points: int,
        active_demand_days: int,
        historical_total: float,
    ) -> ForecastMetrics:
        errors = actual - predicted
        mae = float(np.mean(np.abs(errors)))
        rmse = float(sqrt(np.mean(np.square(errors))))

        return ForecastMetrics(
            trainingPoints=training_points,
            activeDemandDays=active_demand_days,
            historicalTotal=historical_total,
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            confidence=self._classify_confidence(
                training_points=training_points,
                active_demand_days=active_demand_days,
                historical_total=historical_total,
                rmse=rmse,
            ),
        )

    def _classify_confidence(
        self,
        training_points: int,
        active_demand_days: int,
        historical_total: float,
        rmse: float,
    ) -> str:
        if historical_total <= 0 or active_demand_days == 0:
            return "sin_historial"

        average_daily_demand = historical_total / max(training_points, 1)
        relative_error = rmse / average_daily_demand if average_daily_demand > 0 else 0

        if training_points < 30 or active_demand_days < 3:
            return "baja"

        if training_points < 90 or active_demand_days < 8 or relative_error > 1.5:
            return "media"

        return "alta"

    def _round_non_negative(self, value: float) -> float:
        if not np.isfinite(value):
            return 0

        return round(max(0, float(value)), 2)

    def _weighted_average(self, values: list[float]) -> float:
        if not values:
            return 0

        windows = [(7, 0.5), (30, 0.3), (90, 0.2)]
        weighted_total = 0.0
        weight_total = 0.0

        for window_size, weight in windows:
            if len(values) >= window_size:
                weighted_total += float(np.mean(values[-window_size:])) * weight
                weight_total += weight

        if weight_total == 0:
            return float(np.mean(values))

        return weighted_total / weight_total

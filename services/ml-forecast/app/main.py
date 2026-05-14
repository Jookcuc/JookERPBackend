from fastapi import FastAPI

from app.forecasting import MODEL_DESCRIPTION, MODEL_NAME, ForecastingService
from app.schemas import ForecastModelMetadata, ForecastRequest, ForecastResponse


app = FastAPI(
    title="Jook ERP ML Forecast Service",
    version="1.0.0",
    description="Prophet-based demand forecasting service for inventory planning.",
)
forecasting_service = ForecastingService()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(request: ForecastRequest) -> ForecastResponse:
    forecasts = [
        forecasting_service.forecast_product(
            product=product,
            forecast_days=request.forecastDays,
            interval_width=request.intervalWidth,
        )
        for product in request.products
    ]

    return ForecastResponse(
        model=ForecastModelMetadata(
            name=MODEL_NAME,
            granularity="day",
            description=MODEL_DESCRIPTION,
        ),
        forecastDays=request.forecastDays,
        data=forecasts,
    )

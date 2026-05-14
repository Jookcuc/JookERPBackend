from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


ForecastConfidence = Literal["alta", "media", "baja", "sin_historial"]


class DemandPoint(BaseModel):
    date: date
    quantity: float = Field(ge=0)


class ForecastProductRequest(BaseModel):
    productId: int = Field(gt=0)
    productCode: str
    productName: str
    history: list[DemandPoint] = Field(min_length=1)


class ForecastRequest(BaseModel):
    forecastDays: int = Field(default=30, ge=1, le=365)
    intervalWidth: float = Field(default=0.8, ge=0.5, le=0.99)
    products: list[ForecastProductRequest] = Field(min_length=1, max_length=200)


class ForecastPoint(BaseModel):
    date: date
    predictedQuantity: float
    lowerBound: float
    upperBound: float


class ForecastMetrics(BaseModel):
    trainingPoints: int
    activeDemandDays: int
    historicalTotal: float
    mae: float | None = None
    rmse: float | None = None
    confidence: ForecastConfidence


class ProductForecastResponse(BaseModel):
    productId: int
    productCode: str
    productName: str
    modelUsed: str
    forecast: list[ForecastPoint]
    metrics: ForecastMetrics


class ForecastModelMetadata(BaseModel):
    name: str
    granularity: Literal["day"]
    description: str


class ForecastResponse(BaseModel):
    model: ForecastModelMetadata
    forecastDays: int
    data: list[ProductForecastResponse]

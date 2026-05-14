# Jook ERP ML Forecast Service

Microservicio Python para prediccion de demanda con Prophet.

## Ejecutar localmente

Se recomienda Python 3.12 para evitar incompatibilidades de paquetes nativos.

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Ejecutar con Docker

```bash
docker build -t jook-ml-forecast .
docker run --rm -p 8001:8001 jook-ml-forecast
```

Desde la raiz del repositorio tambien puedes usar:

```bash
npm run compose:up
```

## Endpoints

```txt
GET  /health
POST /forecast
```

El backend NestJS consume este servicio usando `ML_FORECAST_URL`.

## Comportamiento

- Entrena un modelo Prophet por producto.
- Si un producto no tiene suficiente historial, devuelve un baseline simple para ese producto.
- Si Prophet falla para un producto, el resto del lote sigue respondiendo.
- El backend NestJS mantiene un fallback local si el servicio completo no esta disponible.

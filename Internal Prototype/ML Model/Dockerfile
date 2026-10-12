FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY tinyml_model.py inference_server.py train.py dataset_generator.py tinyml_weights.npz ./

EXPOSE 8765

CMD ["python", "-u", "inference_server.py"]

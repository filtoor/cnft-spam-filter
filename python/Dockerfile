# Include Python
from python:3.10-slim

# Define your working directory
WORKDIR /

# Install your dependencies
RUN apt-get update \
  && apt-get -y install tesseract-ocr \
  && apt-get -y install ffmpeg libsm6 libxext6

RUN pip freeze > requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

ADD extract_text.py .

# Call your file when your container starts
CMD [ "python", "-u", "/extract_text.py" ]
#!/bin/bash
#container_id=$(docker ps -aq --filter="name=nlq-webserver")
#echo $container_id
#
#docker stop $container_id
#docker rm $container_id
#
#docker build -t d1/gbi .
#
#docker run --name nlq-webserver --env-file .env -p 80:8501 -p 8765:8765 -v $(pwd)/config_files:/app/config_files -v $(pwd)/deployment:/app/deployment d1/gbi:latest

container_id=$(docker ps -aq --filter="name=nlq-webserver")
echo $container_id
docker-compose build streamlit-demo
docker-compose up -d streamlit-demo
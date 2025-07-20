#!/bin/bash
docker run -d --name yva-app -p 8080:8080 --env-file .env yva:latest

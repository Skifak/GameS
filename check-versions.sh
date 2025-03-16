#!/bin/bash

echo "Checking versions of all services..."

echo "Nginx (gamest-nginx-1):"
docker exec gamest-nginx-1 nginx -v

echo "====================================="

echo "Grafana (gamest-grafana-1):"
docker exec gamest-grafana-1 grafana-server --version

echo "====================================="

echo "Promtail (gamest-promtail-1):"
docker exec gamest-promtail-1 promtail --version

echo "====================================="

echo "NATS Exporter (gamest-nats-exporter-1):"
docker exec gamest-nats-exporter-1 prometheus-nats-exporter --version

echo "====================================="

echo "Redis Exporter (gamest-redis-exporter-1):"
docker exec gamest-redis-exporter-1 redis_exporter --version

echo "====================================="

echo "Redis (gamest-redis-1):"
docker exec gamest-redis-1 redis-server --version

echo "====================================="

echo "NATS (gamest-nats-1):"
docker exec gamest-nats-1 nats-server --version

echo "====================================="

echo "Loki (gamest-loki-1):"
docker exec gamest-loki-1 loki --version

echo "====================================="

echo "Prometheus (gamest-prometheus-1):"
docker exec gamest-prometheus-1 prometheus --version

echo "====================================="

echo "Nginx Exporter (gamest-nginx-exporter-1):"
docker exec gamest-nginx-exporter-1 nginx-prometheus-exporter --version

echo "====================================="

echo "Node Exporter (gamest-node-exporter):"
docker exec gamest-node-exporter node_exporter --version

# Stock AI Prediction

AI-powered price prediction for Gold (XAU/USD), EUR/USD and Bitcoin, using LSTM models and FinBERT news sentiment.

## Architecture

| Part | Where it runs |
|---|---|
| Frontend (React + Vite) | Vercel |
| Backend (FastAPI, TensorFlow, FinBERT, scheduler) | AWS ECS on EC2 (`Ai-pred` cluster, Sydney `ap-southeast-2`) |
| Container image | Amazon ECR (`stock-ai-backend`) |
| Database / cache | Supabase / Upstash Redis |
| Model training | Inside the backend container on AWS; models are stored on the EC2 host at `/opt/stockai/models` |

See [system_architecture.md](system_architecture.md) for the request flow.

## Deploy

Pushing changes under `backend/`, `Dockerfile` or `.dockerignore` to `main` runs
[.github/workflows/deploy_aws.yml](.github/workflows/deploy_aws.yml): it builds the image,
pushes it to ECR and forces a new ECS deployment. Frontend changes deploy through Vercel.

The container listens on port 7860; the ECS task maps host port 9090 to it, and Nginx on
the host serves HTTPS in front of port 9090.

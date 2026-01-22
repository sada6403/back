# AWS Deployment Guide for Management IT Backend

This guide explains how to deploy the **Management IT Backend** to AWS using Docker. You can choose to deploy to **AWS App Runner** (easiest, fully managed) or **Amazon EC2** (more control, standard VPS).

## Prerequisites

1.  **AWS Account**: You need an active AWS account.
2.  **Docker Installed**: You need Docker Desktop installed on your machine to build the image.
3.  **AWS CLI** (Optional but recommended): For pushing images to Amazon ECR.

---

## Option 1: Deploy to AWS App Runner (Recommended for Simplicity)

App Runner connects directly to your source code or container image and runs it. It handles autoscaling and TLS (HTTPS) automatically.

### Steps:

1.  **Push Code to GitHub**:
    *   Ensure this backend code is in a GitHub repository.

2.  **Go to AWS App Runner Console**:
    *   Search for "App Runner" in AWS Service search.
    *   Click "Create service".

3.  **Source & Deployment**:
    *   **Repository type**: Select "Source code repository".
    *   **Connect GitHub**: detailed instructions will appear to connect your GitHub account.
    *   **Repository**: Select your repo.
    *   **Branch**: `main` (or your working branch).
    *   **Source directory**: Select the `backend` folder if your repo has multiple folders.

4.  **Configure Build**:
    *   **Runtime**: Node.js 18
    *   **Build command**: `npm install`
    *   **Start command**: `node server.js`
    *   **Port**: `3000`

5.  **Configure Service**:
    *   Give your service a name (e.g., `management-it-api`).
    *   **Environment Variables**: Add your `.env` variables here!
        *   `MONGO_URI`: Your MongoDB connection string.
        *   `PORT`: `3000`

6.  **Deploy**: Click "Create & deploy". AWS will give you a URL (e.g., `https://xyz.awsapprunner.com`).

---

## Option 2: Deploy to Amazon EC2 (Standard Virtual Server)

This method involves creating a virtual machine, installing Docker on it, and running your container.

### 1. Launch EC2 Instance
*   Go to **EC2 Dashboard** > **Launch Instance**.
*   **Name**: `Management-IT-Server`.
*   **OS Image**: Ubuntu Server 22.04 LTS (Free tier eligible).
*   **Instance Type**: t2.micro (Free tier) or t3.small.
*   **Key Pair**: Create a new key pair (`management-it-key.pem`) and download it.
*   **Security Group**: Allow **SSH** (Port 22), **HTTP** (Port 80), and **Custom TCP** (Port 3000).

### 2. Connect to EC2
Open your terminal (PowerShell for Windows) and create an SSH connection:
```bash
ssh -i "path/to/management-it-key.pem" ubuntu@<EC2-Public-IP>
```

### 3. Install Docker on EC2
Run these commands inside the EC2 instace:
```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
```

### 4. Deploy Code
You can either `git clone` your repo or copy files manually.
*   **Clone**: `git clone <your-repo-url>`
*   Navigate to backend: `cd Management_IT/backend`

### 5. Build and Run
1.  **Create .env file**:
    ```bash
    nano .env
    # Paste your MONGO_URI=... inside here. Save with Ctrl+X, Y, Enter.
    ```
2.  **Build Image**:
    ```bash
    sudo docker build -t management-api .
    ```
3.  **Run Container**:
    ```bash
    sudo docker run -d -p 3000:3000 --env-file .env --name api management-api
    ```

### 6. Verify
Visit `http://<EC2-Public-IP>:3000` in your browser. You should see "Management IT Backend is Running".

---

## Important Note on MongoDB
Since you are using MongoDB Atlas (cloud), ensure your **Network Access** whitelist in MongoDB Atlas allows connections from "Anywhere" (`0.0.0.0/0`) OR specifically from the AWS IP address.

# AWS Deployment Guide for Mac2PC

## Prerequisites
- AWS Account
- AWS CLI installed and configured
- Node.js 18+ installed locally

## Option 1: AWS Elastic Beanstalk (Recommended)

### Step 1: Prepare for Deployment
```bash
# Install EB CLI
pip install awsebcli

# Initialize Elastic Beanstalk
eb init
```

### Step 2: Configure Environment
Create `.ebextensions/01-websockets.config`:
```yaml
option_settings:
  aws:elbv2:listener:80:
    Protocol: HTTP
  aws:elbv2:listener:443:
    Protocol: HTTPS
    SSLCertificateArns: arn:aws:acm:region:account:certificate/certificate-id
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: dist/public
```

### Step 3: Set Environment Variables
```bash
eb setenv DATABASE_URL=postgresql://user:pass@host:port/db
eb setenv NODE_ENV=production
```

### Step 4: Deploy
```bash
npm run build
eb create mac2pc-prod
eb deploy
```

## Option 2: AWS App Runner

### Step 1: Create apprunner.yaml
```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm install
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 5000
    env: PORT
  env:
    - name: NODE_ENV
      value: production
```

### Step 2: Deploy via Console
1. Go to AWS App Runner console
2. Create service from source code
3. Connect to your GitHub repository
4. Set environment variables

## Option 3: AWS ECS with ALB

### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY server/ ./server/
COPY shared/ ./shared/
EXPOSE 5000
CMD ["npm", "start"]
```

### Step 2: Create ECS Task Definition
```json
{
  "family": "mac2pc",
  "containerDefinitions": [
    {
      "name": "mac2pc",
      "image": "your-account.dkr.ecr.region.amazonaws.com/mac2pc:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    }
  ]
}
```

## Database Setup

### Option 1: Amazon RDS PostgreSQL
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier mac2pc-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password yourpassword \
  --allocated-storage 20
```

### Option 2: Amazon Aurora Serverless
```bash
# Create Aurora cluster
aws rds create-db-cluster \
  --db-cluster-identifier mac2pc-cluster \
  --engine aurora-postgresql \
  --engine-mode serverless \
  --master-username admin \
  --master-user-password yourpassword
```

## WebSocket Configuration

### For ALB (Application Load Balancer)
- Enable sticky sessions
- Configure health checks on `/health`
- Set up target group with HTTP protocol
- Enable WebSocket support

### Environment Variables for AWS
```bash
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/mac2pc
NODE_ENV=production
PORT=5000
AWS_REGION=us-east-1
```

## Security Configuration

### Option 1: ALB + Security Groups
- Create security group allowing inbound HTTP/HTTPS
- Configure ALB with SSL certificate
- Enable WebSocket upgrade handling

### Option 2: CloudFront + ALB
- Set up CloudFront distribution
- Configure WebSocket behavior
- Add SSL certificate

## Troubleshooting

### WebSocket Issues
1. Ensure ALB supports WebSocket connections
2. Check security group rules
3. Verify sticky sessions are enabled
4. Test with `/health` endpoint

### Database Connection Issues
1. Verify DATABASE_URL format
2. Check VPC security groups
3. Ensure RDS is publicly accessible (if needed)
4. Test connection from EC2 instance

## Cost Optimization
- Use AWS Free Tier resources when possible
- Consider Aurora Serverless for variable workloads
- Use CloudFront for static asset caching
- Monitor usage with CloudWatch
# Scary Fast Apps (SFA) from Neighborhood Studios

<a href="https://twitter.com/intent/follow?screen_name=GoodStuffNearby"><img src="https://scary-apps-fast-assets.s3.us-west-2.amazonaws.com/Follow-NeighborhoodStudios.svg"></a>
<a href="https://writing.neighborhoodstudios.com"><img src="https://img.shields.io/badge/newsletter-subscribe-yellow.svg?style=flat"></a>

## Introduction

---

We're a venture studio that partners with tenacious founders to build hyper-local startups from the ground up.

Every studio is a little different. Our model is to come up with a new idea every month, build an MVP and let users
decide if they love that idea or not.

We build [A LOT OF NEW THINGS](https://writing.neighborhoodstudios.com). Every time we come up with the next best idea,
we're going through a lot of the same motions to get it off the ground.

So we decided to build an opinionated framework to help us build new things faster. Introducing SFA 🚀!

## Features

---

- **✅ Project Setup** - You can clone this repo change names and start building your app.

- **✅ Deployment** - Repo comes with scripts to help you deploy your project end to end. Including front-end, back-end and other services.

- **✅ CI/CD** - We've included GitHub Action scripts, so you can configure automated deployments to branches upon commits with or without tests. We also support multiple envitonments out of the box such as staging, and production. 

- **✅ Authentication** - All tedious user auth activities are baked in. Just sign up for Auth0 and you're ready to go.

- **✅ Authorization** - We support column and row level authorization. You can easily add more authorization rules. We also support multiple roles and ways validate auth tokens.

- **✅ Admin UI** - Give your support team tools they need to get their jobs done from the very beginning.

- **✅ Analytics** - We're embeddeding libraries on the front-end that we think are most useful, feel free to swap them out with anything your team uses.

- **✅ Application Monitoring** - Monitor all environments of your application with default alerting and dashboards baked in.

- **✅ Customer Communication** - Usual customer touchpoints like email/sms/push are baked into the system. Just setup with correct tool credentials, and you're good to go.

- **✅ Payment Processing** - Payment processing such as cards/ACH and banking validation is baked in.

- **✅ Encrypted File Storage** - We frequently collect sensitive user data. So we've applied best practices to encrypt and store files.

## Table of contents
---
- [Tools:](#tools)
  - [Languages & Frameworks:](#languages--frameworks)
  - [Third Party Tools:](#third-party-tools)
- [Quickstart:](#quickstart)
- [Infrastructure:](#infrastructure)
- [Architecture:](#architecture)
- [Client-side tooling:](#client-side-tooling)
- [Demos & Videos:](#demos--videos)
- [Support & Troubleshooting:](#support--troubleshooting)
- [Contributing:](#contributing)
- [License:](#license)

## Quickstart
### Steps before deploying Cloud Formation template
- First time setup AWS:
  - Create a VPC with 2 private 2 public subnets, 2 private subnets must have NAT gateway for internet access
  - Setup Redis and PostreSQL RDS in above VPC, both should have separate security groups
- Create new user and database in the RDS
- Register domain in AWS route53 and have ACM certificate for both api. and app. subdomains
- Setup JWT token generation in auth0, https://hasura.io/learn/graphql/hasura-authentication/integrations/auth0/ (may need more specific hook scripts)

## Infrastructure

- AWS services (ECS, ECR, ALB, S3, Route53, CloudFront, CloudFormation...)
- GitHub actions
- Hasura
- Django
- PostgreSQL
- Redis
- Auth0
- React

## Architecture
This is two part application.

The first part is the Frontend React app that is statically hosted on https://app.\<domain> via S3 and CloudFront distribution.

The second part is the Backend that consists of GraphQL API provided by Hasura 
and Django for background tasks and management. 
Both hosted using ECS services via Application Load Balancer and accessible at https://api.\<domain>

Backend uses Redis and PostgreSQL for data storage and caching.

Auth0 is used to provide end user authentication and a0 JWT token can be directly feed into Hasura API for role based authorization to DB tables.

Django is used to build said database tables - provides data migrations, and provides API that Hasura cannot provide for 3rd party integration.

# FROM node:24-alpine
# # Image: node:24-alpine
# # - 'node:24': We are using Node.js version 24.
# # - 'alpine': Runs on Alpine Linux, a very small, lightweight Linux OS.
# # - Why? It keeps the Docker image tiny and speeds up our builds

# COPY ./Backend .
# # copy the contents of the Backend directory from our local machine to the root of the Docker image.
# RUN npm install
# # Install the dependencies defined in package.json. This is done inside the Docker image, so the container has everything it needs to run the application.
# CMD ["node", "server.js"]
# # The CMD instruction specifies the command to run when the container starts. In this case, it runs the server.js file using Node.js.

# build the frontend [dist folder]
# copy the dist folder to the backend/public folder
FROM node:24-alpine AS frontend-build

WORKDIR /app

COPY ./Frontend/NewLearn/ ./

RUN npm install
RUN npm run build

FROM node:24-alpine as backend-build
COPY ./Backend /app
WORKDIR /app
RUN npm install
COPY  --from=frontend-build /app/dist /app/public
CMD ["node", "server.js"]


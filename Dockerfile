FROM node:8.3
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
# Install app dependencies
COPY . /usr/src/app
RUN npm install
# Start the app
CMD ["npm", "start"]

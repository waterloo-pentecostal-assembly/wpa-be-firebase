# WPA BE Firebase 

This repository contains code for the following Firebase functionality:

* Firebase Functions and tests
* Firestore Rules and tests
* Firebase Emulator for local development 

All work on `wpa-be-app` should be done against the Firebase emulator. Any Firebase Functions and Firestore Rules should also be implemented against the emulator before deploying to the remote Firebase project. 

# Getting Started 

## Setup WSL2 on Windows

To simplify usage and development, follow [these instructions](https://docs.microsoft.com/en-us/windows/wsl/install-win10#manual-installation-steps) to setup WSL2 on your Windows machine using your choice of available Linux distros (recommended to use at least 18.04). 

## Installing Node 12 using NVM

1. Download the nvm install script via cURL: `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.0/install.sh | bash`
2. Ensure that nvm was installed correctly with `nvm --version`, which should return the version of nvm installed.
3. Install Node 12 by running `nvm install 12`.
4. Use Node 12 by running `nvm use 12`.

## Setting up the Repository

1. Clone repository.
2. `cd` into `wpa-be-firebase/functions`.
3. Ensure that you are using Node 12 by running `node -v`. 
3. Run `npm install`.

## Installing the Firebase CLI

1. Follow [these instructions](https://firebase.google.com/docs/cli#install_the_firebase_cli) to install the CLI application on your machine. 
2. Once completed, follow [these instructions](https://firebase.google.com/docs/cli#sign-in-test-cli) to log in and test the Firebase CLI. In the response of `firebase projects:list` you should see `wpa-be-app-dev`. If not, you will have to request access to this project.
3. Once you have access to `wpa-be-app-dev`, run `firebase use wpa-be-app-dev`.

## Running the Firebase Emulator

1. `cd` into `wpa-be-firebase/`.
2. Run `firebase emulators:start --import firestore/seed` to start the emulator using seed data. 
3. Go to `http://localhost:4000/` on your browser and verify that the emulator is running. 

## Running Tests

1. Ensure that the emulator is running. 
2. `cd` into `wpa-be-firebase/functions`.
3. Run `npm test`.


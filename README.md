# Polling DApp

**Description**:  This project focuses on polling, in which registered users can create polls and submit their votes. The voting transactions for this Web3-based application will be saved on a blockchain network. 

  - ## Technology stack: 
    - Blockchain network: Ethereum-testnet (but simply you can change some few things and deploy it to Ethereum-mainnet)
    - Web3 Authentication (Non-custodial auth): [Web3Auth](https://web3auth.io/)
    - Google OAuth to use in Web3Auth provider: [Google cloud portal](https://console.cloud.google.com/apis/dashboard)
    - [Smart Contract](https://github.com/spritlesoftware/polling-smart-contract): Solidity 0.8.17 compiling with Hardhat.js, for deploying and interactions to blockchain network is Ethers.js
    - [Backend](https://github.com/spritlesoftware/polling-dapp): Strapi CMS - Community version (Node JS based CMS), and connected with the Postgres database.
    - [Frontend](https://github.com/spritlesoftware/polling-dapp-frontend): React JS
  - ## Status:  
    Beta version
  - ## Links to production or demo instances
    https://polling.spritle.com


**Screenshot**: 
![](https://raw.githubusercontent.com/spritlesoftware/polling-dapp/demoVideo/converted.mp4)


## Dependencies
- [Node v18.12.1](https://nodejs.org/download/release/v18.12.1/)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)
- [Visual Studio Code (optional)](https://code.visualstudio.com/Download)
- [Metamask - mozilla extension](https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/)

## Configuration
- Clone the repositories from github listed in the [Technology Stack](#technology-stack)
    * polling-smart-contract
    * polling-dapp
    * polling-dapp-frontend
- Create your wallet account in Ethereum blockchain network with Metamask tool
    ### Metamask wallet
    - From their you can get your private-key and public addresses
    - After you installed metamask, change the network from 'Ethereum' (mainnet) to 'Goerli test network'
    - To deploy and do the transactions on Ethereum-testnet blockchain, you need a testnet currency. So you can get it from [Goerli Faucets](https://goerlifaucet.com/). This GoerliETH can only be used in Goerli test network
    ### Alchemy - DApp
    - Create your Alchemy account if you dont have
    - Then create a new DApp in [Alchemy dashboard](https://dashboard.alchemy.com/) - "Apps" menu
    - After created the app, from that you can get API key
    ###* Google OAuth Web-credentials
    - [Google cloud portal](https://console.cloud.google.com/apis/credentials) create a new credentials
        * Give Authorized Javascript Origins of your frontend origin and redirect URLs
        * After you created the credentials, you'll get a credential-clientID
    ### Web3Auth app
    - Create your web3auth login, if you dont have. [Web3Auth dashboard](https://dashboard.web3auth.io)
    - In "Plug and Play" side-menu, create a new project, with EVM based chain selected
        * It will give you the clientID and Secret code. Copy it for your reference
        * Because of we are using Google's auth, "Custom Auth" side-menu, create a new verifier
            + Login provider: Google
            + Google ClientID: paster your copied credential-clientID
    ### Polling-Smart-Contract
    - Go to polling-smart-contract repo folder and run the following commands
        * ```npm install```
        * ```npx hardhat compile```
    - It will compile the contract code, and you can find the ABI and Binary of the compiled codes as a json file in "./artifacts/contracts/Polling.sol/Polling.json"
    - Copy this file's full location to use in Polling-Dapp
    ### Polling-DApp ###
    - Go to polling-dapp repo folder and run the following commands
        * ```npm install```
    - Then copy .env.example file to .env file and modify the file with your key values:
        * ```ALCHEMY_KEY=addYourKeyHere```
        * ```ACCOUNT_PRIVATE_KEY=addYourEthereumWalletPrivateKey```
        * ```NETWORK="goerli"```
        * ```CONTRACT_DEPLOYED_ADDR=addYourDeployedAccountsPublicAddress```
        * ```CONTRACT_ABI=[yourPollingSmartContractCompiledLocation]```
    - In the root of this repo folder dump.sql file will be there, import it to your MySQL server
    - In ```/config/database.js file```, give your database's credentials to connect with the DB. Here I have used with MySQL database
    - To run the project as a dev environment
        * ```npm start dev```
    - This will run the service in all interface's IP's in 1337 port
    ### Polling-DApp-Frontend
    - Go to polling-dapp-frontend folder and run the following commands
        * ```npm install```
        * ```npm run start```

## Usage
Look into the video for usage. 

## Known issues
Because of we are using Ethereum's testnet network, all the requests for transactions will take 5-10 seconds depending on the network traffic.

## Getting help
If you are facing any issues, please raise the issue.

----
## Credits and references

1. Ethereum's sample codes from documentation page
2. Strapi NodeJS CMS
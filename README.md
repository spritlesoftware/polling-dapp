# Polling DApp

**Description**:  This project focuses on polling, in which registered users can create polls and submit their votes. The voting transactions for this Web3-based application will be saved on a blockchain network. 

  - ## Technology stack: 
    - Blockchain network: Ethereum-testnet (but simply you can change some few things and deploy it to Ethereum-mainnet)
    - Web3 Authentication (Non-custodial auth): [Web3Auth](https://web3auth.io/)
    - Google OAuth to use in Web3Auth provider: [Google cloud portal](https://console.cloud.google.com/apis/dashboard)
    - [Smart Contract](https://github.com/spritlesoftware/polling-smart-contract): Solidity 0.8.17
      * Compiling with [Hardhat.js](https://hardhat.org/)
      * Then deploying the contract file, interactions to/from blockchain network through [Ethers.js](https://docs.ethers.org/v5/)
    - Provider: [Alchemy](https://dashboard.alchemy.com/)
    - [Backend](https://github.com/spritlesoftware/polling-dapp): [Strapi CMS - Community version](https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html) (Node JS based CMS), and connected with the MySQL database.
    - [Frontend](https://github.com/spritlesoftware/polling-dapp-frontend): React JS
  - ## Status:  
    Beta version
  - ## Links to production or demo instances
    https://polling.spritle.com


**Screenshot**: 


https://user-images.githubusercontent.com/16348260/213775794-227815b2-86b6-488a-a379-937e1db6ad0e.mp4


## Dependencies
- [Node v18.12.1](https://nodejs.org/download/release/v18.12.1/)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/)
- [Visual Studio Code (optional)](https://code.visualstudio.com/Download)
- [Metamask - mozilla extension](https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/)

## Configuration
- Clone the repositories from github
    * [polling-smart-contract](https://github.com/spritlesoftware/polling-smart-contract)
    * [polling-dapp](https://github.com/spritlesoftware/polling-dapp)
    * [polling-dapp-frontend](https://github.com/spritlesoftware/polling-dapp-frontend)
  ### Metamask wallet
  - Create your wallet account in Ethereum blockchain network with Metamask tool
    - From their you can get your private-key and public address
    - After you installed metamask in your mozilla-firefox browser, then change the network from 'Ethereum' (mainnet) to 'Goerli test network'
    - To deploy and do the transactions on Ethereum-testnet network, you need a testnet currency/token, and you can get it from [Goerli Faucets](https://goerlifaucet.com/). This GoerliETH can only be used in Goerli test network
  ### Alchemy - DApp
  - Alchemy is one of the provider for Ethereum network. For [more](https://docs.alchemy.com/docs/ethers-js-provider#ethersjs-provider-use-cases)
  - Create your Alchemy account if you dont have
  - Then create a new DApp in [Alchemy dashboard](https://dashboard.alchemy.com/) - "Apps" menu
    * Set CHAIN to **Ethereum**
    * Set NETWORK to **Goerli** for testnet, **Mainnet** if for production usage
  - After the app creation, you can get the API key from **VIEW KEY** button
  ### Google OAuth Web-credentials
  - In [Google cloud portal](https://console.cloud.google.com/apis/credentials), create a new credentials for our app, and configure the following:
      * Give Authorized Javascript Origins of your frontend origin and redirect URLs
      * After you created the credentials, you'll get this app's credential-clientID
  ### Web3Auth app
  - Create your web3auth account, if you don't have. [Web3Auth dashboard](https://dashboard.web3auth.io)
  - Once you signed-in with your account, choose "Plug and Play" side-menu and create a new project. Then select EVM based chain on the settings
      * It will give you the clientID and Secret code. Copy it for your reference
      * Because of we are using Google's authentication, select "Custom Auth" from side-menu, and create a "new verifier". And configure as follows:
          + Login provider: Google
          + Google ClientID: paste your copied credential-clientID (In previous step you have created in google cloud page)
  ### Polling-Smart-Contract
  - Go to polling-smart-contract repo folder and run the following commands
      * ```npm install```
      * ```npx hardhat compile```
  - It will compile the contract code, and you can find the ABI and Binary of the compiled codes as a json file in ```./artifacts/contracts/Polling.sol/Polling.json```
  - Copy this file's full location path to use in ```Polling-Dapp/.env``` file, and set it for the variable "CONTRACT_ABI"
  ### Polling-DApp ###
  - Go to polling-dapp repo folder and run the following commands
      * ```npm install --force```
  - Then copy .env.example file to .env file and modify the file with your key values:
      * ```HOST=0.0.0.0```
        + IP address the backend service going to run. 0.0.0.0 is recommended for expose it on all the available IP's on the host server
      * ```PORT=1337```
        + Port on which the server should be running
      * ```APP_KEYS="toBeModified1,toBeModified2"```
        + Look into [Strapi doc](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/server.html#available-options)
      * ```API_TOKEN_SALT=tobemodified```
        + Look into [Strapi doc](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/admin-panel.html#available-options)
      * ```ADMIN_JWT_SECRET=tobemodified```
        + Look into [Strapi doc](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/admin-panel.html#available-options)
      * ```JWT_SECRET=tobemodified```
        + Look into [Strapi doc](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/admin-panel.html#available-options)
      * ```ALCHEMY_KEY=addYourKeyHere```
        + Key copied from the Alchemy dashboard
      * ```ACCOUNT_PRIVATE_KEY=addYourEthereumWalletPrivateKey```
        + Private key copied from metamask wallet
      * ```NETWORK="goerli"```
        + If you ready to deploy it to Ethereum's Mainnet, change it to **mainnet**
      * ```CONTRACT_ABI=[yourPollingSmartContractCompiledLocation]```
        + Copied from the polling-smart-contract repo step, after the compilation
  - In the root of this repo folder dump.sql file will be there, import it to your MySQL server
  - In ```/config/database.js``` file, give your database's credentials to connect with the DB. Here I have used with MySQL database
  - To run the project as a dev environment
      * ```npm run develop```
  - This will run the service in all interface's IP in 1337 port
      * Goto http://localhost:1337/admin
		  * Create your super-admin account
		  * Create your API token to set it for all the frontend calls, Settings => API Tokens => Create new API Token
			* You'll get a token key, copy that for your referecnce. this key will be used in polling-dapp-frontend
		  * Set role-Authenticated to full permissions, on controller **test-collections**
		  * set role-Public for **test-collection/contractExpire** API alone
  ### Polling-DApp-Frontend
  - Go to polling-dapp-frontend folder and run the following commands
      * ```npm install --force```
      * Copy the **.env.example** file and as **.env** and modify it with your keys:
        + ```REACT_APP_WEB3AUTH_CLIENTID```
          - Copied client-id from Web3Auth's **Plug and Play** app page
        + ```REACT_APP_GCP_CLIENT_SECRET```
          - Copied client-secret id from Google console's **Credentials** page
        + ```REACT_APP_BACKEND```
          - Backend's (Strapi CMS - nodejs service) URL
        + ```REACT_APP_LOGIN_ADAP_LOGO```
          - Login adapter's logo URL you wish to add
        + ```REACT_APP_BACKEND_TOKEN```
          - API Token created on Strapi CMS, for authorize the REST calls
        + ```REACT_APP_BLOCKCHAIN_ACCOUNT```
          - Whether it can use Each user's private key to do the transactions on ethereum or use the default account. If True
      * ```npm run start```
   - This will run the front-end service in all interfaces's IP in 3000 port

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
3. Web3Auth's docs

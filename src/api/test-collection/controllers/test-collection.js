'use strict';

const ethers = require('ethers');
const { formatEther, formatUnits, UnicodeNormalizationForm } = require('ethers/lib/utils');
const { format } = require('mysql');

/**
 * test-collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

/**
 * getWeb3UserInit() will initalize the singer object using given params. Internal function, as API call
 * @param {*} localUser Boolean variable, True if localuser going to be used, else False
 * @param {*} user If localUser is false, then user details should be passed
 * @returns {*} signed user object
 */
const getWeb3UserInit = async(localUser, user=null) => {
  const provider = new ethers.providers.AlchemyProvider(process.env.NETWORK, process.env.ALCHEMY_KEY);    // Define an Alchemy Provider

  let privatekey = null;

  if (localUser) {
    privatekey = process.env.ACCOUNT_PRIVATE_KEY;     // Create a signer, with local privatekey
  } else {
    privatekey = user.privatekey;                     // Create a signer, with given privatekey
  }

  const signer = new ethers.Wallet(privatekey, provider);  // Creating a wallet with the user's private key and provider

  return signer;
};

/**
 * Connect to the given contract address to do the blockchain transactions. Internal funcion, not as a API call
 * @param {*} userDet is user-details object with privatekey, if privatekey is not provided, default user's privatekey will be used
 * @param {*} _contractAddress address of the contract deployed to the network
 * @returns votingContract object
 */
const connectToContract = async (userDet, _contractAddress) => {
  try {
    userDet = (userDet) ? userDet : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
    let user = (userDet.privatekey) ? userDet : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };

    if (_contractAddress == undefined)
      return null;

    const votingContract = await getWeb3UserInit(false, user).then((signer) => {
      const contract = require(process.env.CONTRACT_ABI);  //Getting compiled solidity's ABI file as a JSON
      const abi = contract.abi;                            // Get contract ABI
      return new ethers.Contract(_contractAddress, abi, signer);   // Create a contract instance
    });
    return votingContract;
  }
  catch (err) {
    console.log(err);
    return null;
  }
};

module.exports = createCoreController('api::test-collection.test-collection', ({ strapi }) => ({
    async exampleAction(ctx) {
      try {
        console.log("inside example Action");
        ctx.body = "hello world";
      } catch (err) {
        ctx.body = "=== error: " + err;
      }
    },

    /**
     * This function is for get singin the user and initialize the singer object.
     * @param {*} ctx is RequestContext object will have the request params with required params
     * @returns the status of the user initialization
     */
    async signerInit(ctx) {

      let returnable = {};

      try {
        if (ctx.request.body.localUser) {
          await getWeb3UserInit(true).then((signer) => {
            signer.getBalance().then(data => {
              returnable.userBalance = formatUnits(data, 'ether');
            });
          }).catch(err => {
            returnable.error = err;
          });
        } else {
          if (!ctx.request.body.user) {
            returnable.error = "privatekey not shared";
            return returnable;
          }
          
          await getWeb3UserInit(false, ctx.request.body.user).then((signer) => {
            signer.getBalance().then(data => {
              returnable.userBalance = formatUnits(data, 'ether');
            });
          }).catch(err => {
            returnable.error = err;
          });
        }
      } catch (err) {
        returnable.error = err;
      }

      return returnable;
    },

    /**
     * After singned-in the user, getting balance of the user from their ethereum wallet
     * @param {*} ctx Context-request, with user.privatekey to get wallet balance
     * @returns user balance from the ethereum wallet
     */
    async getBalance(ctx) {
      try {
        let user = null;
        if (ctx.request.body.user) {
          user = ctx.request.body.user;
        } else {
          user = {
            "privatekey": process.env.ACCOUNT_PRIVATE_KEY
          };
        }

        let returnable = {};

        await getWeb3UserInit(false, user).then((signer) => {
          signer.getBalance().then(data => {
            returnable.balance = formatUnits(data, 'ether');
          });
        });
      } 
      catch (err) {
        returnable.error = err;
      }
    },

    /**
     * Vote for the given candidate, to corresponding contract
     * @param {*} ctx Context-request, will contains contractId, user:{username, usermail, privatekey (to vote as a diff user)}, candidate
     * @returns Voted status or acknowledgement
     */
    async votingC_vote(ctx) {

      if (ctx.request.body.user == undefined) {
        return {"error": "user.usermail is mandatory"};
      }
      
      const entity = await strapi.service('api::test-collection.test-collection');

      let checkAlreadyVoted = false;

      let listOfVoters = null;

      let contractAddress = null;

      let error = null;

      try {
        checkAlreadyVoted = await entity.findOne(ctx.request.body.contractId).then(async(obj) => {
          if (obj == undefined) {
            error = "Given contract-id is not found on the DB";
            return false;
          }
          if (obj.creator == ctx.request.body.user.usermail) {
            error = "You are the owner, not able to vote";
            return false;
          }
          if (obj.listOfVoters.find(element => element == ctx.request.body.user.usermail)) {
            error = "already voted";
            return false;
          }
          listOfVoters = obj.listOfVoters;
          contractAddress = obj.contract_address;
          return true;
        });
      } catch (ee) {
        console.log(ee);
        error = ee;
      }

      if (!checkAlreadyVoted)
        return {"error": error};

      let returnable = {};
      
      await connectToContract(ctx.request.body.user, contractAddress)      // Connecting to contract
        .then(async (votingContract) => {
            await votingContract.Vote(ctx.request.body.candidate)   // Voting on Blockchain
              .then(async() => {          
                returnable.status = true;
                
                //**** update listOfVoters[] in DB - START **** */
                listOfVoters.push(ctx.request.body.user.usermail);

                let payload = {
                  "data": {
                    "listOfVoters": listOfVoters
                  }
                };
                
                await strapi.entityService.update("api::test-collection.test-collection", ctx.request.body.contractId, payload);
                //**** update listOfVoters[] in DB - END **** */

              }).catch((err) => {
                console.log("=== error: ", err);
                returnable.error = err;
              })
        });
      return returnable;
    },

    /**
     * To deploy a new Polling contract to the network
     * @param {*} ctx request context, with { user.privatekey, user.usermail}, statement and candidates
     * @returns the new deployed contract address and contractId
     */
    async votingC_newPollDeploy(ctx) {
      let user = null; //(ctx.request.body.user) ? ctx.request.body.user : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
      //user = (ctx.request.body.user.privatekey) ? ctx.request.body.user : { "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };

      if (ctx.request.body.user) {
        if (ctx.request.body.user.usermail == undefined) {
          return {"error": "User object with usermail is mandatory"};
        }
        user = (ctx.request.body.user.privatekey) ? ctx.request.body.user : { "usermail": ctx.request.body.user.usermail, "privatekey" : process.env.ACCOUNT_PRIVATE_KEY };
      } else {
        return {"error": "User object with usermail is mandatory"};
      }

      let returnable = {};

      await getWeb3UserInit(false, user).then(async(signer) => {
        const contract_det = require(process.env.CONTRACT_ABI);

        // The factory we use for deploying contracts
        let factory = new ethers.ContractFactory(contract_det.abi, contract_det.bytecode, signer);

        // Deploy an instance of the contract
        await factory.deploy(ctx.request.body.statement, ctx.request.body.candidates).then(async(contract) => {
          // The address is available immediately, but the contract
          // is NOT deployed yet
          // console.log(contract.address);

          // The transaction that the signer sent to deploy
          // contract.deployTransaction

          // Wait until the transaction is mined (i.e. contract is deployed)
          //  - returns the receipt
          //  - throws on failure (the reciept is on the error)
          const recp = await contract.deployTransaction.wait();
          returnable.contractAddress = recp.contractAddress;
        });
      });

      // **** DB store ****//
      const entity = await strapi.service('api::test-collection.test-collection');

      try {
        let req = {
            "data": {
                "contract_address": returnable.contractAddress,
                "state": "Polling",
                "creator": ctx.request.body.user.usermail,
                "listOfVoters": []
            }
        };
        req.data.publishedAt = Date.now();

        if (ctx.request.body.expiring)
          req.data.expiring = ctx.request.body.expiring;

        await entity.create(req).then(async(obj) => {
          returnable.contracId = obj.id;
        });
      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }

      return returnable;
    },

    /**
     * To getting the Poll details, like poll statement and poll's list of candidates. This function will not cost us.
     * @param {Context} ctx Request object, will contain the user.privatekey, contractId. If ctx had "withVotesCount=true", then it'll returns with each candidates vote count till now
     * @returns the statement of the poll and candidates list
     */
    async getPollDetails(ctx) {

      let contractAddress = undefined;
      let returnable = {};

      try {
        await strapi.service('api::test-collection.test-collection').findOne(ctx.request.body.contractId)   //Database search for contract with contract-id
          .then(async(obj) => {
            if (obj == undefined) {
              console.log("Given contract-id is not found on the DB");
              returnable.error = "Given contract-id is not found on the DB";
              return;
              };
            contractAddress = obj.contract_address;
          });

      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }

      if (contractAddress == undefined)
        return {"error": returnable};

      await connectToContract(ctx.request.body.user, contractAddress)      // Connecting to contract
        .then(async (votingContract) => {

          await votingContract.getStatement()         //getting Statement of the poll
              .then(async(statement) => {     
                returnable.statement = statement;
                await votingContract.getCandidates()    //getting Candidates of the poll
                  .then(async(cands) => {
                    if (ctx.request.body.withVotesCount) {
                      await votingContract.VoteInfo().then(async(data) => {
                        returnable.candidates = [];
                        for(let i=0;i<cands.length;i++) {
                          let candidate = {"candidate": cands[i], "count": data[i].toNumber()};
                          returnable.candidates.push(candidate);
                        }
                      }).catch((err) => {
                        console.log("=== ", err);
                        returnable.error = err;
                      });
                    } else {
                      returnable.candidates = cands;
                    }
                  }).catch((err) => {
                    console.log("=== ", err);
                    error = err;
                  });
              }).catch((err) => {
                console.log("=== ", err);
                returnable.error = err;
              });
        });
      
      return returnable; 
    },

    /**
     * Get the user-group of the given user's mail-id, and returns the currently open-polls
     * @param {*} ctx Context-request will contains the user.usermail
     * @returns corresponding user's userid if the given mail-id is registered, and returns the list of open polls
     */
    async myRole(ctx) {

      let returnable = {};

      if (ctx.request.body.user.usermail == "" || ctx.request.body.user.usermail==undefined)
        return {}

      returnable.role_id = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          email: ctx.request.body.user.usermail,
        },
        populate: {
          role: {
            select: ['id', 'name']
          }
        }
      }).then(async(obj) => {
        if (obj == undefined)
          return 0;
        else
          return obj.role.id;
      }).catch(err => {
        console.log("error: ", err);
        return {};
      });

      if (JSON.stringify(returnable.role_id) == "{}")
        return returnable;

      returnable.polls = await strapi.db.query('api::test-collection.test-collection').findMany({
        select: ['id', 'created_at', 'creator', 'list_of_voters', 'contract_address', 'expiring', 'result'],
        where: {
          state: "Polling"
        }
      }).then(async(obj) => {
        return obj;
      });

      for(let i=0;i<returnable.polls.length;i++) {    //for each live polls, iterating

        await connectToContract(ctx.request.body.user, returnable.polls[i].contract_address)      // Connecting to contract
        .then(async (votingContract) => {

          await votingContract.getStatement()         //getting Statement of the poll
              .then(async(statement) => {
                returnable.polls[i].statement = statement;
               });
        });
        
        let votedPersons = returnable.polls[i].listOfVoters;
      
        if (votedPersons.find(element => element == ctx.request.body.user.usermail))
          returnable.polls[i].voted = true;
        else
          returnable.polls[i].voted = false;

        returnable.polls[i].votesCount = votedPersons.length;
        delete returnable.polls[i].listOfVoters;
        delete returnable.polls[i].contract_address;
      }

      return returnable;
    },

    /**
     * Closes the contract and declaring the result
     * @param {*} ctx Context request, with body parameters of user.privatekey, contractId
     * @returns the winner candidate's name and voting count for the candidate
     */
    async announceResult(ctx) {

      ctx.request.body.withVotesCount = true;

      return await this.getPollDetails(ctx).then(async(op) => {
        let max = {
          "candidate": "",
          "i": 0,
          "count": 0
        }
  
        let i = 0;

        if (op == undefined || op.error != undefined)
          return {};

        op.candidates.forEach(element => {      // **** Here we have sorting issue that, selecting the top candidate will be wrong when same no. of votes for multiple candidates //
          if(element.count > max.count)
          {
            max.count = element.count;
            max.i = i;
            max.candidate = element.candidate;
          }
          i++;
        });


        //**** update listOfVoters[] in DB - START **** */

        let payload = {
          "data": {
            "state": "Polling_Ended",
            "result": max.candidate
          }
        };

        await strapi.entityService.update("api::test-collection.test-collection", ctx.request.body.contractId, payload);
        //**** update listOfVoters[] in DB - END **** */

        delete max.i;
        return max;
      });
    },
    
    /**
     * Checks for list of contracts expiring with the current date and trigger the announceResult for those contracts
     * @param {*} ctx Context request
     * @returns the status of the function
     */
    async contractExpire(ctx) {
      try {
        return await strapi.db.query('api::test-collection.test-collection').findMany({
          select: ['id', 'contract_address'],
          where: {
            $and: [
              {
                expiring: {
                  $lt: new Date().toJSON().split('T')[0]      //To get current date, with the format of YYYY/MM/DD to filter less than this date
                }
              },
              {
                state: {
                  $eq: 'Polling'
                }
              }
            ],
          }
        }).then(async(obj) => {
          if (obj == undefined)
            return {};
          else {
            for(let i=0;i<obj.length;i++) {
              ctx.request.body.contractId = obj[i].id;
              await this.announceResult(ctx).then(async(output) => {
                console.log("updated the contract: " + obj[i].id, output);
              }).catch(err => {
                console.log(err);
              });
            }
            return {status: true};
          }
        }).catch(err => {
          console.log(err);
        });

      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }
    },

    /**
     * To get only the expired polls
     * @param {*} ctx Context request object without any params
     * @returns the list of poll's statement and other details
     */
    async expiredPolls(ctx) {
      try {
        return await strapi.db.query('api::test-collection.test-collection').findMany({
          select: ['id', 'contract_address', 'creator', 'result'],
          where: {
                state: {
                  $eq: "Polling_Ended"
                }
              }
        }).then(async(obj) => {
          if (obj == undefined)
            return {};
          else {
            let returnable = [];
            for(let i=0;i<obj.length;i++) {    //for each live polls, iterating
              await connectToContract(undefined, obj[i].contract_address)      // Connecting to contract
              .then(async (votingContract) => {
                await votingContract.getStatement()         //getting Statement of the poll
                    .then(async(statement) => {
                      delete obj[i].contract_address;
                      returnable.push({...obj[i], statement});
                    });
              });
            }
            return returnable;
          }
        }).catch(err => {
          console.log(err);
        });

      } catch (ee) {
        console.log(ee);
        returnable.error = ee;
      }
    }

  }));
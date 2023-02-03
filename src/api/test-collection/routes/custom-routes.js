'use strict';

/**
 * test-collection router
 */

module.exports = {
    routes: [
      {
        method: 'POST',
        path: '/exampleAction',
        handler: 'test-collection.exampleAction',
      },
      {
        method: 'POST',
        path: '/signerInit',
        handler: 'test-collection.signerInit',
      },
      {
        method: 'POST',
        path: '/getBalance',
        handler: 'test-collection.getBalance',
      },
      {
        method: 'POST',
        path: '/votingC_vote',
        handler: 'test-collection.votingC_vote',
      },
      {
        method: 'POST',
        path: '/votingC_newPollDeploy',
        handler: 'test-collection.votingC_newPollDeploy',
      },
      {
        method: 'POST',
        path: '/getPollDetails',
        handler: 'test-collection.getPollDetails',
      },
      {
        method: 'POST',
        path: '/myRole',
        handler: 'test-collection.myRole',
      },
      {
        method: 'POST',
        path: '/announceResult',
        handler: 'test-collection.announceResult',
      },
      {
        method: 'GET',
        path: '/contractExpire',
        handler: 'test-collection.contractExpire'
      },
      {
        method: 'GET',
        path: '/expiredPolls',
        handler: 'test-collection.expiredPolls'
      }
    ],
  };

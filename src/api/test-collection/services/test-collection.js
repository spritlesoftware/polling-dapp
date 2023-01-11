'use strict';

/**
 * test-collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::test-collection.test-collection');

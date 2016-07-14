'use strict';

var mongoose = require('mongoose');

var Transactions = require('../models/transactions.model.js');
var Users = require('../models/user.model.js');
var config = require('../config');
var Stripe = require('stripe')(config.stripeApiKey);

exports.index = function(req, res, next) {
  if (req.body) {
    var transaction = new Transactions({
      name: req.body.name
    });
    transaction.save(function(err, trans) {
      if (err) {
        return console.log(err);
      }
      res.status(200).end();
    });
  }
};

exports.createTransaction = function(req, res, next) {

  var userId = req.decoded._id;
  var paymentDetails = req.body;
  var cardDetails = paymentDetails.card;
  var charge = paymentDetails.charge;

  exports.makePayment(userId, cardDetails, charge, function(error, resp) {

    if (error) {
      return res.status(500).json(error);
    }

    res.status(200).json({
      message: 'Payment is created.'
    });

  });

};

exports.createToken = function(cardDetails, callback) {

  Stripe.tokens.create({
    card: cardDetails
  }, function(error, token) {

    if (error) {

      console.log(error);

      return callback({ code: 'UNABLE_TO_STORE_CARD', error: error });

    }

    callback(null, token.id);

  });

};

exports.createStripeCustomer = function(tokenId, callback) {

  Stripe.customers.create({
    source: tokenId
  }, function(error, customer) {

    if (error) {

      console.log(error);
      return callback({ code: 'UNABLE_TO_CREATE_CUSTOMER' });

    }

    callback(null, customer.id);

  });

};

exports.saveStripeCustomerIdToUser = function(userId, customerId, callback) {

  var _id = mongoose.Types.ObjectId(userId);
  
  Users.update({
    _id: _id
  }, {
    $set: {
      striperCustomerId: customerId
    }
  }, function(error) {

    if (error) {
      console.log(error);
      return callback({ code: 'UNABLE_TO_STORE_TOKEN' });
    }

    callback(null, true);

  });

};

exports.getStripeCustomerId = function(userId, callback) {

  var _id = mongoose.Types.ObjectId(userId);

  Users.findOne({ _id: _id }, function(error, user) {

    if (error) {

      console.log(error);
      return callback({ code: 'UNABLE_TO_FETCH_USER', error: error });

    }

    if (!user) {

      return callback({ code: 'USER_NOT_FOUND' });

    }

    callback(null, user.toObject().striperCustomerId);

  });

};

exports.makePayment = function(userId, cardDetails, charge, callback) {

  exports.getStripeCustomerId(userId, function(error, customerId) {

    if (error) {
      return callback(error);
    }
    
    if (!customerId) {

      return exports.createToken(cardDetails, function(error, tokenId) {

        if (error) {
          return callback(error);
        }

        exports.createStripeCustomer(tokenId, function(error, customerId) {

          if (error) {
            return callback(error);
          }

          exports.saveStripeCustomerIdToUser(userId, customerId, function(error) {

            if (error) {
              return callback(error);
            }

            exports.doCreateTransaction({
              amount: charge.amount,
              currency: charge.currency,
              customer: customerId,
              description: 'Charge for test@example.com'
            }, callback);

          });

        });

      });

    }

    exports.doCreateTransaction({
      amount: charge.amount,
      currency: charge.currency,
      customer: customerId,
      description: 'Charge for test@example.com'
    }, callback);

  });

};

exports.doCreateTransaction = function(charge, callback) {

  Stripe.charges.create(charge, function(error, charge) {

    if (error) {

      console.log(error);
      return callback({ code: 'FAILED_TO_CREATE_CHARGE' });

    }

    var transaction = new Transactions({
      transactionId: charge.id,
      amount: charge.amount,
      created: charge.created,
      currency: charge.currency,
      description: charge.description,
      paid: charge.paid,
      sourceId: charge.source.id
    });


    transaction.save(function(error) {

      if (error) {

        console.log(error);
        return callback({ code: 'FAILED_TO_SAVE_TRANSACTION' });

      }

      callback(null, {
        message: 'Payment is created.'
      });

    });

  });

};
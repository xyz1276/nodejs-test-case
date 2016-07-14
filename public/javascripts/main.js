'use strict';

/*global Stripe:true*/
/*global $form:true*/

var isSubmit = false;
$(document).ready(function() {

  $('#submittransaction').click(function() {

    console.log('ok');

    $.ajax({
      url: '/createtransaction',
      type: 'POST',
      headers: {
        'x-access-token': $('#token').html()
      },
      data: JSON.stringify({
        card: {
          number: $('#cardnumber').val(),
          cvc: $('#card-cvc').val(),
          exp_month: $('#card-expiry-month').val(),
          exp_year: $('#card-expiry-year').val()
        },
        charge: {
          amount: $('#amount').val(),
          currency: $('#currency').val()
        }
      }),
      json: true,
      contentType: 'application/json',
      dataType: 'json'
    }).done(function(response) {

      if (response.message) {
        $('.payment-errors').text(response.code);
      }

    });

  });

});
module.exports = {

  generatePasscode: function () {
    var text = "";
    var possible = "0123456789";

    for (var i = 0; i < 4; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;

  }
};

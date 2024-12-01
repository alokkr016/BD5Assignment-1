let { DataTypes, sequelize } = require("../lib/");

let role = sequelize.define("role", {
  title: DataTypes.TEXT,
});

module.exports = {
  role,
};

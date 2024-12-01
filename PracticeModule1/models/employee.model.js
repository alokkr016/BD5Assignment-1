let { DataTypes, sequelize } = require("../lib/");

let employee = sequelize.define("employee", {
  name: DataTypes.TEXT,
  email: DataTypes.TEXT,
});

module.exports = {
  employee,
};

let { DataTypes, sequelize } = require("../lib/");

let department = sequelize.define("department", {
  name: DataTypes.TEXT,
});

module.exports = {
  department,
};

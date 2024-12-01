let { DataTypes, sequelize } = require("../lib/");
let { employee } = require("./employee.model");
let { role } = require("./role.model");
let employeeRole = sequelize.define("employeeRole", {
  employeeId: {
    type: DataTypes.INTEGER,
    references: { model: employee, key: "id" },
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: { model: role, key: "id" },
  },
});

module.exports = {
  employeeRole,
};

employee.belongsToMany(role, { through: employeeRole });

let express = require("express");

let { department } = require("./models/department.model");
let { employee } = require("./models/employee.model");
let { role } = require("./models/role.model");
let { employeeDepartment } = require("./models/employeeDepartment.model");
let { employeeRole } = require("./models/employeeRole.model");
let { sequelize } = require("./lib/index");

const app = express();
app.use(express.json());

app.get("/seed_db", async (req, res) => {
  await sequelize.sync({ force: true });

  const departments = await department.bulkCreate([
    { name: "Engineering" },
    { name: "Marketing" },
  ]);

  const roles = await role.bulkCreate([
    { title: "Software Engineer" },
    { title: "Marketing Specialist" },
    { title: "Product Manager" },
  ]);

  const employees = await employee.bulkCreate([
    { name: "Rahul Sharma", email: "rahul.sharma@example.com" },
    { name: "Priya Singh", email: "priya.singh@example.com" },
    { name: "Ankit Verma", email: "ankit.verma@example.com" },
  ]);

  // Associate employees with departments and roles using create method on junction models
  await employeeDepartment.create({
    employeeId: employees[0].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[0].id,
    roleId: roles[0].id,
  });

  await employeeDepartment.create({
    employeeId: employees[1].id,
    departmentId: departments[1].id,
  });
  await employeeRole.create({
    employeeId: employees[1].id,
    roleId: roles[1].id,
  });

  await employeeDepartment.create({
    employeeId: employees[2].id,
    departmentId: departments[0].id,
  });
  await employeeRole.create({
    employeeId: employees[2].id,
    roleId: roles[2].id,
  });

  return res.json({ message: "Database seeded!" });
});

async function getEmployeeDepartments(employeeId) {
  const employeeDepartments = await employeeDepartment.findAll({
    where: { employeeId },
  });

  let departmentData;
  for (let empDep of employeeDepartments) {
    departmentData = await department.findOne({
      where: { id: empDep.departmentId },
    });
  }

  return departmentData;
}

async function getEmployeeRoles(employeeId) {
  const employeeRoles = await employeeRole.findAll({
    where: { employeeId },
  });

  let roleData;
  for (let empRole of employeeRoles) {
    roleData = await role.findOne({
      where: { id: empRole.roleId },
    });
  }

  return roleData;
}

// Helper function to get employee details with associated departments and roles
async function getEmployeeDetails(employeeData) {
  const department = await getEmployeeDepartments(employeeData.id);
  const role = await getEmployeeRoles(employeeData.id);

  return {
    ...employeeData.dataValues,
    department,
    role,
  };
}

async function getAllEmployees() {
  let employees = await employee.findAll();
  let employeeDetails = [];

  for (let emp of employees) {
    const details = await getEmployeeDetails(emp); // Process each employee sequentially
    employeeDetails.push(details);
  }

  return employeeDetails;
}

app.get("/employees", async (req, res) => {
  try {
    let employees = await getAllEmployees();
    if (employees.length === 0) {
      // Return a 404 status if no employees are found
      return res.status(404).json({ message: "No employees found" });
    }
    res.status(200).json({ employees: employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getEmployeeById(id) {
  let employeeData = await employee.findOne({ where: { id } });
  if (employeeData === null) {
    return employeeData;
  }
  return await getEmployeeDetails(employeeData);
}

app.get("/employees/details/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let employee = await getEmployeeById(id);
    if (!employee) {
      return res
        .status(404)
        .json({ message: "No employee found with id " + id });
    }
    res.status(200).json({ employee: employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getEmployeesByDepartmentId(departmentId) {
  let departmentAssociations = await employeeDepartment.findAll({
    where: { departmentId },
  });

  let employeesInDepartment = [];
  for (let association of departmentAssociations) {
    // Fetch employee details for each employee associated with the department
    let employeeRecord = await employee.findOne({
      where: { id: association.employeeId },
    });
    if (employeeRecord) {
      let employeeDetails = await getEmployeeDetails(employeeRecord);
      employeesInDepartment.push(employeeDetails);
    }
  }

  return employeesInDepartment;
}

app.get("/employees/department/:departmentId", async (req, res) => {
  try {
    let departmentId = req.params.departmentId;
    let employees = await getEmployeesByDepartmentId(departmentId);
    if (!employees) {
      return res.status(404).json({
        message: "No employees found with departmentId " + departmentId,
      });
    }
    res.status(200).json({ employees: employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getEmployeesByRoleId(roleId) {
  let roleAssociations = await employeeRole.findAll({ where: { roleId } });
  let employeesWithParticularRole = [];
  for (let association of roleAssociations) {
    let employeeRecord = await employee.findOne({
      where: { id: association.employeeId },
    });

    if (employeeRecord) {
      let employeeDetails = await getEmployeeDetails(employeeRecord);
      employeesWithParticularRole.push(employeeDetails);
    }
  }
  return employeesWithParticularRole;
}

app.get("/employees/role/:roleId", async (req, res) => {
  try {
    let roleId = req.params.roleId;
    let employees = await getEmployeesByRoleId(roleId);
    if (!employees) {
      return res.status(404).json({
        message: "No employees found with roleId " + roleId,
      });
    }
    res.status(200).json({ employees: employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function getEmployeesInSortedOrder(order) {
  let employees = await employee.findAll({ order: [["name", order]] });
  // Map employee details concurrently
  const employeesData = await Promise.all(
    employees.map((emp) => getEmployeeDetails(emp))
  );

  return employeesData;
}

app.get("/employees/sort-by-name", async (req, res) => {
  try {
    let order = req.query.order;
    let employees = await getEmployeesInSortedOrder(order);
    if (!employees) {
      return res.status(404).json({
        message: "No employees found",
      });
    }
    res.status(200).json({ employees: employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function addNewEmployee(newEmployeeData) {
  let newEmployee = await employee.create({
    name: newEmployeeData.name,
    email: newEmployeeData.email,
  });

  if (newEmployeeData.departmentId) {
    await employeeDepartment.create({
      employeeId: newEmployee.id,
      departmentId: newEmployeeData.departmentId,
    });
  }

  if (newEmployeeData.roleId) {
    await employeeRole.create({
      employeeId: newEmployee.id,
      roleId: newEmployeeData.roleId,
    });
  }
  let employeeDetailsResult = await getEmployeeDetails(newEmployee);
  return employeeDetailsResult;
}

app.post("/employees/new", async (req, res) => {
  try {
    const { name, email, departmentId, roleId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const response = await addNewEmployee({
      name,
      email,
      departmentId,
      roleId,
    });
    return res.status(201).json(response); // 201 Created
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function updateEmployeeById(newEmployeeBody, id) {
  let employeeData = await employee.findOne({ where: { id } });
  if (!employeeData) {
    return {};
  }

  if (employeeData.departmentId) {
    await employeeDepartment.destroy({
      where: {
        employeeId: parseInt(employeeData.id),
      },
    });
    await employeeDepartment.create({
      employeeId: employeeData.id,
      departmentId: newEmployeeBody.departmentId,
    });
  }

  if (employeeData.roleId) {
    await employeeRole.destroy({
      where: {
        employeeId: parseInt(employeeData.id),
      },
    });
    await employeeRole.create({
      employeeId: employeeData.id,
      roleId: newEmployeeBody.roleId,
    });
  }

  employeeData.set(newEmployeeBody);
  let updatedEmployeeData = await employeeData.save();
  let finalEmployeedata = await getEmployeeDetails(updatedEmployeeData);
  return finalEmployeedata;
}

app.post("/employees/update/:id", async (req, res) => {
  try {
    let newEmployeeBody = req.body;
    let id = req.params.id;

    let response = await updateEmployeeById(newEmployeeBody, id);
    if (!response) {
      return res.status(404).json({ message: "employee not found" });
    }
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function deleteById(id) {
  let destroyedEmployee = await employee.destroy({ where: { id } });
  if (destroyedEmployee === 0) {
    return {};
  }
  return { message: `Employee with ID ${id} has been deleted` };
}

app.post("/employees/delete", async (req, res) => {
  try {
    let id = parseInt(req.body.id);
    let response = await deleteById(id);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Express server initialized");
});

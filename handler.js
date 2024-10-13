const AWS = require("aws-sdk");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;

// Joi schema for product validation
const productSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().precision(2).positive().required(),
  category: Joi.string().required(),
  stock: Joi.number().integer().min(0).required(),
});

// Create Product
module.exports.createProduct = async (event) => {
  const { name, description, price, category, stock } = JSON.parse(event.body);

  // Validate the request body
  const { error } = productSchema.validate({
    name,
    description,
    price,
    category,
    stock,
  });
  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.details[0].message }),
    };
  }

  

  const productId = uuidv4();
  const timestamp = new Date().toISOString();

  const params = {
    TableName: PRODUCTS_TABLE,
    Item: {
      ProductId: productId,
      Name: name,
      Description: description,
      Price: price,
      Category: category,
      Stock: stock,
      CreatedAt: timestamp,
      UpdatedAt: timestamp,
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return {
      statusCode: 201,
      body: JSON.stringify({ productId }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create product", message: error.message }),
    };
  }
};

// Get Product by ID
module.exports.getProductById = async (event) => {
  const { productId } = event.pathParameters;

  const params = {
    TableName: PRODUCTS_TABLE,
    Key: { ProductId: productId },
  };

  try {
    const result = await dynamoDB.get(params).promise();
    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Product not found" }),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Update Product
module.exports.updateProduct = async (event) => {
  const { productId } = event.pathParameters;
  const { name, description, price, category, stock } = JSON.parse(event.body);

  // Validate the request body
  const { error } = productSchema.validate({
    name,
    description,
    price,
    category,
    stock,
  });
  if (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.details[0].message }),
    };
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: PRODUCTS_TABLE,
    Key: { ProductId: productId }, // Ensure that 'id' correctly maps to the 'ProductId'
    UpdateExpression:
      "SET #name = :name, Description = :desc, Price = :price, Category = :category, Stock = :stock, UpdatedAt = :updatedAt",
    ExpressionAttributeNames: { "#name": "Name" },
    ExpressionAttributeValues: {
      ":name": name,
      ":desc": description,
      ":price": price,
      ":category": category,
      ":stock": stock,
      ":updatedAt": timestamp,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDB.update(params).promise();
    return { statusCode: 200, body: JSON.stringify(result.Attributes) };
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: "Could not update product", message: error.message }) 
    };
  }
};


// Delete Product
module.exports.deleteProduct = async (event) => {
  const { productId } = event.pathParameters;

  const params = {
    TableName: PRODUCTS_TABLE,
    Key: { ProductId: productId },
  };

  try {
    await dynamoDB.delete(params).promise();
    return { statusCode: 204 };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

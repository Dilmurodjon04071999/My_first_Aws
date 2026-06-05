import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, 'data');
const dbFile = path.join(dbDir, 'products.json');
const usersFile = path.join(dbDir, 'users.json');

// Helper to make sure the database is initialized
export async function initDb() {
  try {
    // Ensure the data folder exists
    await fs.mkdir(dbDir, { recursive: true });
    
    let products = [];
    try {
      const data = await fs.readFile(dbFile, 'utf8');
      products = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is invalid, we will seed it
      console.log('Database file not found or empty. Seeding from FakeStoreAPI...');
    }

    if (!Array.isArray(products) || products.length === 0) {
      // Fetch from fake store api
      const response = await fetch('https://fakestoreapi.com/products');
      if (!response.ok) {
        throw new Error(`Failed to fetch from FakeStoreAPI: ${response.statusText}`);
      }
      products = await response.json();
      // Save it locally
      await fs.writeFile(dbFile, JSON.stringify(products, null, 2), 'utf8');
      console.log(`Successfully seeded ${products.length} products to database!`);
    } else {
      console.log(`Database loaded with ${products.length} products.`);
    }

    // Initialize users
    let users = [];
    try {
      const data = await fs.readFile(usersFile, 'utf8');
      users = JSON.parse(data);
    } catch (err) {
      // File doesn't exist or is invalid
    }

    if (!Array.isArray(users) || users.length === 0) {
      users = [
        { id: 1, username: 'admin', password: 'admin', role: 'admin', name: 'System Admin' },
        { id: 2, username: 'user', password: 'user', role: 'user', name: 'Default User' }
      ];
      await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
      console.log('Successfully seeded default users!');
    } else {
      console.log(`Database loaded with ${users.length} users.`);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    // If seeding fails, write an empty array to prevent constant failing
    try {
      await fs.writeFile(dbFile, JSON.stringify([], null, 2), 'utf8');
    } catch (_) {}
  }
}

// Get all products
export async function getProducts() {
  try {
    const data = await fs.readFile(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

// Save all products
export async function saveProducts(products) {
  try {
    await fs.writeFile(dbFile, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving products:', error);
    return false;
  }
}

// Get all users
export async function getUsers() {
  try {
    const data = await fs.readFile(usersFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

// Save all users
export async function saveUsers(users) {
  try {
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

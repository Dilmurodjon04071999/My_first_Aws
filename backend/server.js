import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { initDb, getProducts, saveProducts, getUsers, saveUsers } from './db.js';

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'ziya_networking_jwt_secret_key_2026';

// Users mock database loaded dynamically from db.js

app.use(cors());
app.use(express.json());

// Seeding/initializing database before server starts
await initDb();

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin role required' });
  }
}

// ---------------- AUTH ROUTES ----------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const users = await getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Create JWT token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name || user.username
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const users = await getUsers();
    const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (exists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    
    const newUser = {
      id: nextId,
      username,
      password,
      role: role || 'user',
      name: name || username
    };

    users.push(newUser);
    await saveUsers(users);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Get current profile (verifies token)
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// ---------------- PRODUCT ROUTES ----------------

// 1. GET ALL PRODUCTS (Public)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// 2. GET SINGLE PRODUCT (Public)
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const products = await getProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// 3. CREATE PRODUCT (Admin Only)
app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, price, description, category, image } = req.body;
    
    if (!title || !price || !category) {
      return res.status(400).json({ message: 'Title, price, and category are required' });
    }

    const products = await getProducts();
    
    // Find next ID (max + 1)
    const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct = {
      id: nextId,
      title,
      price: parseFloat(price),
      description: description || '',
      category,
      image: image || 'https://fakestoreapi.com/img/81fPKd-2AYL._AC_SL1500_.jpg', // Default fallback image
      rating: { rate: 0.0, count: 0 }
    };
    
    products.unshift(newProduct); // Add to the top of the list
    await saveProducts(products);
    
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// 4. UPDATE PRODUCT (Admin Only)
app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, price, description, category, image } = req.body;
    
    const products = await getProducts();
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const currentProduct = products[productIndex];
    
    const updatedProduct = {
      ...currentProduct,
      title: title !== undefined ? title : currentProduct.title,
      price: price !== undefined ? parseFloat(price) : currentProduct.price,
      description: description !== undefined ? description : currentProduct.description,
      category: category !== undefined ? category : currentProduct.category,
      image: image !== undefined ? image : currentProduct.image
    };

    products[productIndex] = updatedProduct;
    await saveProducts(products);
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// 5. DELETE PRODUCT (Admin Only)
app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const products = await getProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    
    if (products.length === filteredProducts.length) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await saveProducts(filteredProducts);
    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`ZiyaNetworking Backend running on port ${PORT}`);
});

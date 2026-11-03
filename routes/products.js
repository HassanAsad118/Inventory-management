const express = require("express");
const Product = require("../models/Product");
const Activity = require("../models/Activity");

const router = express.Router();

router.use((req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "Please log in." });
    }
    next();
});

function validProduct(body) {
    return (
        typeof body.name === "string" && body.name.trim() &&
        typeof body.sku === "string" && body.sku.trim() &&
        typeof body.category === "string" && body.category.trim() &&
        Number.isInteger(body.quantity) && body.quantity >= 0 &&
        typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0
    );
}

function productFields(body) {
    return {
        name: body.name.trim(),
        sku: body.sku.trim().toUpperCase(),
        category: body.category.trim(),
        quantity: body.quantity,
        price: body.price,
    };
}

function handleError(error, res) {
    if (error.code === 11000) {
        return res.status(409).json({ error: "That SKU already exists in your inventory." });
    }
    console.error(error);
    return res.status(500).json({ error: "Something went wrong." });
}

router.get("/activity", async (req, res) => {
    try {
        const activity = await Activity.find({ owner: req.session.userId })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(activity);
    } catch (error) {
        handleError(error, res);
    }
});

router.get("/", async (req, res) => {
    try {
        const query = { owner: req.session.userId };

        if (req.query.search) {
            const search = req.query.search.trim().slice(0, 80);
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
            ];
        }

        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.stock === "low") {
            query.quantity = { $lte: 5 };
        }

        const products = await Product.find(query).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        handleError(error, res);
    }
});

router.post("/", async (req, res) => {
    if (!validProduct(req.body || {})) {
        return res.status(400).json({ error: "Enter a name, SKU, category, valid quantity, and valid price." });
    }

    try {
        const product = await Product.create({
            ...productFields(req.body),
            owner: req.session.userId,
        });

        await Activity.create({
            owner: req.session.userId,
            action: "created",
            productName: product.name,
        });

        res.status(201).json(product);
    } catch (error) {
        handleError(error, res);
    }
});

router.put("/:id", async (req, res) => {
    if (!validProduct(req.body || {})) {
        return res.status(400).json({ error: "Enter valid product details." });
    }

    try {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, owner: req.session.userId },
            productFields(req.body),
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        await Activity.create({
            owner: req.session.userId,
            action: "updated",
            productName: product.name,
        });

        res.json(product);
    } catch (error) {
        handleError(error, res);
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({
            _id: req.params.id,
            owner: req.session.userId,
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found." });
        }

        await Activity.create({
            owner: req.session.userId,
            action: "deleted",
            productName: product.name,
        });

        res.json({ message: "Product deleted." });
    } catch (error) {
        handleError(error, res);
    }
});

module.exports = router;
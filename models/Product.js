const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        name: { type: String, required: true, trim: true },
        sku: { type: String, required: true, trim: true, uppercase: true },
        category: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 },
    },
    { timestamps: true }
);

productSchema.index({ owner: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);
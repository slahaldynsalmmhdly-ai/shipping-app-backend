const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const {
    protect
} = require("../middleware/authMiddleware");
const {
    generateFleetAccount
} = require("../utils/generateFleetAccount");

// @desc    Add new vehicle to user's fleet (for company users)
// @route   POST /api/vehicles
// @access  Private (Company only)
router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== "company") {
            res.status(403);
            throw new Error("Not authorized, only companies can manage fleet");
        }

        const {
            driverName,
            transportType,
            departureCity,
            departureCountry,
            tripType,
            distance,
            duration,
            internationalDestinations,
            cities,
            vehicleType,
            vehicleColor,
            currency,
            discount,
            plateNumber,
            status,
            imageUrls,
        } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        // التحقق من عدم تكرار رقم اللوحة
        const vehicleExists = await Vehicle.findOne({
            plateNumber
        });

        if (vehicleExists) {
            res.status(400);
            throw new Error("Vehicle with this plate number already exists");
        }

        // التحقق من الصور (اختيارية، حد أقصى 5 صور)
        if (imageUrls && imageUrls.length > 5) {
            res.status(400);
            throw new Error("الحد الأقصى للصور هو 5");
        }

        // التحقق من الحقول المطلوبة حسب نوع النقل
        if (transportType === "international") {
            if (!departureCountry || !tripType || !distance || !duration) {
                res.status(400);
                throw new Error("جميع حقول النقل الدولي مطلوبة");
            }
            if (!internationalDestinations || internationalDestinations.length === 0) {
                res.status(400);
                throw new Error("يجب إضافة وجهة دولية واحدة على الأقل");
            }
        } else if (transportType === "domestic") {
            if (!cities || cities.length === 0) {
                res.status(400);
                throw new Error("يجب إضافة مدينة واحدة على الأقل");
            }
        }

        // توليد حساب الأسطول
        const {
            fleetId,
            password: plainPassword
        } = await generateFleetAccount();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const vehicleData = {
            user: req.user._id,
            driverName,
            transportType,
            departureCity,
            vehicleType,
            vehicleColor,
            currency,
            discount: discount || 0,
            plateNumber,
            status: status || "متاح",
            imageUrls,
            fleetAccountId: fleetId,
            fleetPassword: hashedPassword,
            accountCreatedAt: new Date(),
            isAccountActive: true,
        };

        // إضافة الحقول حسب نوع النقل
        if (transportType === "international") {
            vehicleData.departureCountry = departureCountry;
            vehicleData.tripType = tripType;
            vehicleData.distance = distance;
            vehicleData.duration = duration;
            vehicleData.internationalDestinations = internationalDestinations;
        } else if (transportType === "domestic") {
            vehicleData.cities = cities;
        }

        const vehicle = new Vehicle(vehicleData);
        const createdVehicle = await vehicle.save();

        res.status(201).json({
            success: true,
            data: createdVehicle,
            fleetAccount: {
                fleetId: fleetId,
                password: plainPassword,
                message: "احفظ هذه البيانات! لن تتمكن من رؤية كلمة السر مرة أخرى"
            }
        });
    })
);

// @desc    Get all vehicles for the logged-in user
// @route   GET /api/vehicles/my-vehicles
// @access  Private (Company only)
router.get(
    "/my-vehicles",
    protect,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== "company") {
            res.status(403);
            throw new Error("Not authorized, only companies can view their fleet");
        }

        const vehicles = await Vehicle.find({
            user: req.user._id
        });
        res.json({
            success: true,
            data: vehicles
        });
    })
);

// @desc    Update a specific vehicle in user's fleet
// @route   PUT /api/vehicles/:vehicleId
// @access  Private (Company only)
router.put(
    "/:vehicleId",
    protect,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== "company") {
            res.status(403);
            throw new Error("Not authorized, only companies can manage fleet");
        }

        const {
            driverName,
            transportType,
            departureCity,
            departureCountry,
            tripType,
            distance,
            duration,
            internationalDestinations,
            cities,
            vehicleType,
            vehicleColor,
            currency,
            discount,
            plateNumber,
            status,
            imageUrls,
        } = req.body;

        const vehicle = await Vehicle.findById(req.params.vehicleId);

        if (!vehicle) {
            res.status(404);
            throw new Error("Vehicle not found");
        }

        if (vehicle.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Not authorized to update this vehicle");
        }

        // التحقق من تكرار رقم اللوحة (إذا تم تغييره)
        if (plateNumber && plateNumber !== vehicle.plateNumber) {
            const vehicleExists = await Vehicle.findOne({
                plateNumber
            });
            if (vehicleExists) {
                res.status(400);
                throw new Error("Vehicle with this plate number already exists");
            }
        }

        // التحقق من الصور إذا تم تحديثها
        if (imageUrls && imageUrls.length > 5) {
            res.status(400);
            throw new Error("الحد الأقصى للصور هو 5");
        }

        // تحديث الحقول المشتركة
        if (driverName) vehicle.driverName = driverName;
        if (transportType) vehicle.transportType = transportType;
        if (departureCity) vehicle.departureCity = departureCity;
        if (vehicleType) vehicle.vehicleType = vehicleType;
        if (vehicleColor) vehicle.vehicleColor = vehicleColor;
        if (currency) vehicle.currency = currency;
        if (discount !== undefined) vehicle.discount = discount;
        if (plateNumber) vehicle.plateNumber = plateNumber;
        if (status) vehicle.status = status;
        if (imageUrls) vehicle.imageUrls = imageUrls;

        // تحديث حقول النقل الدولي
        if (transportType === "international" || vehicle.transportType === "international") {
            if (departureCountry) vehicle.departureCountry = departureCountry;
            if (tripType) vehicle.tripType = tripType;
            if (distance) vehicle.distance = distance;
            if (duration) vehicle.duration = duration;
            if (internationalDestinations) vehicle.internationalDestinations = internationalDestinations;

            // مسح حقول النقل الداخلي
            vehicle.cities = [];
        }

        // تحديث حقول النقل الداخلي
        if (transportType === "domestic" || vehicle.transportType === "domestic") {
            if (cities) vehicle.cities = cities;

            // مسح حقول النقل الدولي
            vehicle.departureCountry = undefined;
            vehicle.tripType = undefined;
            vehicle.distance = undefined;
            vehicle.duration = undefined;
            vehicle.internationalDestinations = [];
        }

        const updatedVehicle = await vehicle.save();
        res.json({
            success: true,
            data: updatedVehicle
        });
    })
);

// @desc    Delete a specific vehicle from user's fleet
// @route   DELETE /api/vehicles/:vehicleId
// @access  Private (Company only)
router.delete(
    "/:vehicleId",
    protect,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== "company") {
            res.status(403);
            throw new Error("Not authorized, only companies can manage fleet");
        }

        const vehicle = await Vehicle.findById(req.params.vehicleId);

        if (!vehicle) {
            res.status(404);
            throw new Error("Vehicle not found");
        }

        if (vehicle.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Not authorized to delete this vehicle");
        }

        await vehicle.deleteOne();
        res.json({
            message: "Vehicle removed"
        });
    })
);

// @desc    Get all online vehicles for the logged-in company user
// @route   GET /api/vehicles/online-drivers
// @access  Private (Company only)
router.get(
    "/online-drivers",
    protect,
    asyncHandler(async (req, res) => {
        if (req.user.userType !== "company") {
            res.status(403);
            throw new Error("Not authorized, only companies can view their fleet");
        }

        const onlineVehicles = await Vehicle.find({
            user: req.user._id,
            isOnline: true
        }).select('driverName vehicleName imageUrl fleetAccountId'); // جلب الحقول الضرورية فقط

        res.json({
            success: true,
            data: onlineVehicles
        });
    })
);

// @desc    Get all vehicles for a specific user (for public profile view)
// @route   GET /api/vehicles/user/:userId
// @access  Public
router.get(
    "/user/:userId",
    asyncHandler(async (req, res) => {
        const vehicles = await Vehicle.find({
            user: req.params.userId
        });
        res.json({
            success: true,
            data: vehicles
        });
    })
);

module.exports = router;
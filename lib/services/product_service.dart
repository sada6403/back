import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../config/api_config.dart';

class Product {
  String id;
  String name;
  String description;
  double price; // selling price (LKR)
  double cost; // buying price (LKR)
  List<String> images; // local file paths
  double soldPerMonth; // kg sold per month
  double boughtPerMonth; // kg bought per month
  double currentStock; // available stock in kg
  DateTime createdAt; // when product was added

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.cost,
    List<String>? images,
    this.soldPerMonth = 0.0,
    this.boughtPerMonth = 0.0,
    this.currentStock = 0.0,
    DateTime? createdAt,
  }) : images = images ?? [],
       createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'productId': id,
    'name': name,
    'description': description,
    'defaultPrice': price,
    'buyingPrice': cost,
    'images': images,
    'soldPerMonth': soldPerMonth,
    'boughtPerMonth': boughtPerMonth,
    'currentStock': currentStock,
    'createdAt': createdAt.toIso8601String(),
    'unit':
        'Kg', // Default unit for now, as Management_IT doesn't seem to have it
  };

  factory Product.fromJson(Map<String, dynamic> m) => Product(
    id: m['_id']?.toString() ?? '', // MongoDB _id
    name: m['name'] as String? ?? '',
    description: m['description'] as String? ?? '',
    price: (m['defaultPrice'] as num?)?.toDouble() ?? 0.0,
    cost: (m['buyingPrice'] as num?)?.toDouble() ?? 0.0,
    images: (m['images'] as List<dynamic>?)?.map((e) => e as String).toList(),
    soldPerMonth: (m['soldPerMonth'] as num?)?.toDouble() ?? 0.0,
    boughtPerMonth: (m['boughtPerMonth'] as num?)?.toDouble() ?? 0.0,
    currentStock: (m['currentStock'] as num?)?.toDouble() ?? 0.0,
    createdAt: m['createdAt'] != null
        ? DateTime.parse(m['createdAt'] as String)
        : DateTime.now(),
  );
}

class ProductService {
  static final List<Product> _products = [];
  static String get _baseUrl => ApiConfig.products;

  static Future<void> init() async {
    await fetchProducts();
  }

  static Future<void> fetchProducts() async {
    try {
      final response = await http.get(Uri.parse(_baseUrl));
      if (response.statusCode == 200) {
        final List<dynamic> list = jsonDecode(response.body);
        _products.clear();
        for (final e in list) {
          _products.add(Product.fromJson(e as Map<String, dynamic>));
        }
      }
    } catch (e) {
      debugPrint('Error fetching products: $e');
    }
  }

  static List<Product> getProducts() => List.unmodifiable(_products);

  static Future<void> addProduct(Product p) async {
    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(p.toJson()),
      );
      if (response.statusCode == 201) {
        await fetchProducts();
      }
    } catch (e) {
      debugPrint('Error adding product: $e');
    }
  }

  static Future<void> updateProduct(String id, Product updated) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updated.toJson()),
      );
      if (response.statusCode == 200) {
        final idx = _products.indexWhere((e) => e.id == id); // id is _id now
        if (idx != -1) _products[idx] = updated;
      }
    } catch (e) {
      debugPrint('Error updating product: $e');
    }
  }

  static Future<void> deleteProduct(String id) async {
    try {
      final response = await http.delete(Uri.parse('$_baseUrl/$id'));
      if (response.statusCode == 200) {
        _products.removeWhere((e) => e.id == id);
      }
    } catch (e) {
      debugPrint('Error deleting product: $e');
    }
  }

  // Totals in LKR
  static double totalSelling() {
    final months = monthlyIncome();
    return months.fold(0.0, (a, b) => a + b);
  }

  static double totalBuying() {
    final months = monthlyOutcome();
    return months.fold(0.0, (a, b) => a + b);
  }

  // Monthly breakdown (12 months). Income = selling revenue per month; outcome = buying cost per month.
  // Returns a list of 12 values representing the last 12 calendar months (oldest->newest)
  static List<double> monthlyIncome() {
    final months = List<double>.filled(12, 0.0);
    if (_products.isEmpty) return months;

    final now = DateTime.now();

    for (int i = 0; i < 12; i++) {
      // compute month start for (now - (11 - i)) so index 11 is current month
      final monthOffset = i - 11;
      final monthDate = DateTime(now.year, now.month + monthOffset, 1);
      for (final p in _products) {
        // include product only if it existed at this month
        if (!p.createdAt.isAfter(
          DateTime(monthDate.year, monthDate.month + 1, 0),
        )) {
          months[i] += p.price * p.soldPerMonth;
        }
      }
    }
    return months;
  }

  static List<double> monthlyOutcome() {
    final months = List<double>.filled(12, 0.0);
    if (_products.isEmpty) return months;

    final now = DateTime.now();

    for (int i = 0; i < 12; i++) {
      final monthOffset = i - 11;
      final monthDate = DateTime(now.year, now.month + monthOffset, 1);
      for (final p in _products) {
        if (!p.createdAt.isAfter(
          DateTime(monthDate.year, monthDate.month + 1, 0),
        )) {
          months[i] += p.cost * p.boughtPerMonth;
        }
      }
    }
    return months;
  }

  // Get available stock summary by product name
  static Map<String, double> getStockByProduct() {
    final stock = <String, double>{};
    for (final p in _products) {
      stock[p.name] = p.currentStock;
    }
    return stock;
  }

  // Helpful factory for creating product with an id
  static Product create({
    required String name,
    required String description,
    required double price,
    required double cost,
    List<String>? images,
    double soldPerMonth = 0.0,
    double boughtPerMonth = 0.0,
    double currentStock = 0.0,
    DateTime? createdAt,
  }) {
    return Product(
      id: '', // Generated by backend
      name: name,
      description: description,
      price: price,
      cost: cost,
      images: images,
      soldPerMonth: soldPerMonth,
      boughtPerMonth: boughtPerMonth,
      currentStock: currentStock,
      createdAt: createdAt,
    );
  }
}

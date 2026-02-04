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
  double totalSoldValue; // Total LKR from all-time sales
  double totalBoughtValue; // Total LKR from all-time buys
  double currentStock; // available stock
  DateTime createdAt; // when product was added
  String unit; // 'Kg', 'g', 'number', 'packets'
  List<Map<String, dynamic>> history; // Last 12 months transactions

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.cost,
    List<String>? images,
    this.soldPerMonth = 0.0,
    this.boughtPerMonth = 0.0,
    this.totalSoldValue = 0.0,
    this.totalBoughtValue = 0.0,
    this.currentStock = 0.0,
    DateTime? createdAt,
    this.unit = 'Kg',
    List<Map<String, dynamic>>? history,
  }) : images = images ?? [],
       history = history ?? [],
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
    'totalSoldValue': totalSoldValue,
    'totalBoughtValue': totalBoughtValue,
    'currentStock': currentStock,
    'createdAt': createdAt.toIso8601String(),
    'unit': unit,
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
    totalSoldValue: (m['totalSoldValue'] as num?)?.toDouble() ?? 0.0,
    totalBoughtValue: (m['totalBoughtValue'] as num?)?.toDouble() ?? 0.0,
    currentStock: (m['currentStock'] as num?)?.toDouble() ?? 0.0,
    createdAt: m['createdAt'] != null
        ? DateTime.parse(m['createdAt'] as String)
        : DateTime.now(),
    unit: m['unit'] as String? ?? 'Kg',
    history:
        (m['history'] as List<dynamic>?)
            ?.map((e) => e as Map<String, dynamic>)
            .toList() ??
        [],
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
        final dynamic body = jsonDecode(response.body);
        List<dynamic> list = [];
        if (body is List) {
          list = body;
        } else if (body is Map && body.containsKey('data')) {
          final data = body['data'];
          if (data is List) {
            list = data;
          }
        }

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

  static Future<bool> addProduct(Product p) async {
    try {
      final request = http.MultipartRequest('POST', Uri.parse(_baseUrl));
      debugPrint('--- Adding Product ---');
      request.fields['name'] = p.name;
      request.fields['description'] = p.description;
      request.fields['defaultPrice'] = p.price.toString();
      request.fields['buyingPrice'] = p.cost.toString();
      request.fields['currentStock'] = p.currentStock.toString();
      request.fields['unit'] = p.unit;

      // Add other fields as needed, match backend expectations
      request.fields['soldPerMonth'] = p.soldPerMonth.toString();
      request.fields['boughtPerMonth'] = p.boughtPerMonth.toString();
      request.fields['totalSoldValue'] = p.totalSoldValue.toString();
      request.fields['totalBoughtValue'] = p.totalBoughtValue.toString();

      // Handle images
      debugPrint('Processing ${p.images.length} images for upload...');
      for (final imagePath in p.images) {
        // Simple check: if it looks like a local path (not http/starts with uploads), stick it in file
        // Or better: try to create a file, if it fails assume it's a server path?
        // Usually local paths from ImagePicker are absolute paths.
        if (!imagePath.startsWith('http') &&
            !imagePath.startsWith('uploads/')) {
          try {
            debugPrint('Attaching file: $imagePath');
            request.files.add(
              await http.MultipartFile.fromPath('images', imagePath),
            );
          } catch (e) {
            debugPrint('Could not add file $imagePath: $e');
            // If we can't add it as a file, maybe it's a relative path we should keep?
            // But for addProduct, usually all are new files.
          }
        } else {
          // If it's an existing image (server path), we might want to send it so backend keeps it
          // But backend new logic expects 'images' field for existing ones.
          // MultipartRequest fields can have multiple values for same key?
          // http package 'fields' is Map<String, String>, so it DOES NOT support multiple values easily like that
          // unless we manually encode it or use a different approach.
          // However, standard http.MultipartRequest 'fields' is value only.
          // Only 'files' is a list.
          // To send multiple 'images' string fields, we might need a custom request or hack.
          // Actually, 'fields' in MultipartRequest is Map<String, String>.
          // A common workaround is 'images[]' or just handle it as a single JSON field if backend supports.
          // Let's attempt to send existing images as a separate field or check if backend supports array in 'images' key via body-parser(it does).
          // But MultipartRequest fields don't support arrays directly.
          // Trick: request.files.add(http.MultipartFile.fromString('images', imagePath)); ?
          // Or just send a JSON string for existing images in a separate field 'existingImages' and update backend?
          // OR: just don't support keeping old images/mixing for now, OR rely on backend handling 'images' field if we can send multiple.
          // Wait, I can try to add it to 'fields' but it overwrites.
          // Let's just modify the backend logic slightly to accept 'existingImages' if needed, or use a workaround.
          // Workaround: Send 'images' as a JSON string? "['path1']"
          // Backend code: imagePaths = Array.isArray(images) ? images : [images];
          // If we send it as one string, backend might treat it as one image.
        }
      }

      // If we have existing images logic conflict, for ADD it's fine (usually new).

      final streamResponse = await request.send();
      final response = await http.Response.fromStream(streamResponse);

      if (response.statusCode == 201) {
        await fetchProducts();
        return true;
      } else {
        debugPrint('Failed to add product: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Error adding product: $e');
      return false;
    }
  }

  static Future<bool> updateProduct(String id, Product updated) async {
    try {
      debugPrint('--- Updating Product ($id) ---');

      // Check if we have any NEW local files to upload
      bool hasNewImages = updated.images.any(
        (imagePath) =>
            !imagePath.startsWith('http') &&
            !imagePath.startsWith('uploads/') &&
            !imagePath.startsWith('uploads\\'),
      );

      if (hasNewImages) {
        // Use Multipart Request
        debugPrint('Mode: Multipart Update (New Images Detected)');
        final request = http.MultipartRequest(
          'PUT',
          Uri.parse('$_baseUrl/$id'),
        );
        request.fields['name'] = updated.name;
        request.fields['description'] = updated.description;
        request.fields['defaultPrice'] = updated.price.toString();
        request.fields['buyingPrice'] = updated.cost.toString();
        request.fields['currentStock'] = updated.currentStock.toString();
        request.fields['unit'] = updated.unit;

        List<String> existingImages = [];

        for (final imagePath in updated.images) {
          if (!imagePath.startsWith('http') &&
              !imagePath.startsWith('uploads/') &&
              !imagePath.startsWith('uploads\\')) {
            try {
              final file = await http.MultipartFile.fromPath(
                'images',
                imagePath,
              );
              request.files.add(file);
            } catch (e) {
              debugPrint('Skipping file: $e');
            }
          } else {
            existingImages.add(imagePath);
          }
        }

        request.fields['existingImages'] = jsonEncode(existingImages);

        final streamResponse = await request.send();
        final response = await http.Response.fromStream(streamResponse);
        return response.statusCode == 200;
      } else {
        // Use JSON Request (Text only or Image Deletion)
        debugPrint('Mode: JSON PATCH Update (No New Images)');

        final Map<String, dynamic> body = {
          'name': updated.name,
          'description': updated.description,
          'defaultPrice': updated.price,
          'buyingPrice': updated.cost,
          'currentStock': updated.currentStock,
          'unit': updated.unit,
          // CRITICAL: We MUST send this, even if empty, to update the DB.
          'existingImages': updated.images,
        };

        final response = await http.patch(
          Uri.parse('$_baseUrl/$id'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(body),
        );

        if (response.statusCode == 200) {
          await fetchProducts();
          return true;
        } else {
          debugPrint('Update failed: ${response.body}');
          return false;
        }
      }
    } catch (e) {
      debugPrint('Error updating product: $e');
      return false;
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
    // if (_products.isEmpty) return months; // Don't return early, just defaults to 0s

    final now = DateTime.now();

    for (int i = 0; i < 12; i++) {
      final monthOffset = i - 11;
      // Start of the target month
      final monthStart = DateTime(now.year, now.month + monthOffset, 1);
      // End of the target month
      final monthEnd = DateTime(
        now.year,
        now.month + monthOffset + 1,
        0,
        23,
        59,
        59,
      );

      for (final p in _products) {
        for (final tx in p.history) {
          // Check if transaction is 'sell' and falls in this month
          final type = tx['type'];
          final dateStr = tx['date'];
          if (type == 'sell' && dateStr != null) {
            final date = DateTime.parse(dateStr.toString());
            if (date.isAfter(monthStart.subtract(const Duration(seconds: 1))) &&
                date.isBefore(monthEnd.add(const Duration(seconds: 1)))) {
              // Use totalAmount from history if available, else calc
              final amount = (tx['totalAmount'] as num?)?.toDouble() ?? 0.0;
              months[i] += amount;
            }
          }
        }
      }
    }
    return months;
  }

  static List<double> monthlyOutcome() {
    final months = List<double>.filled(12, 0.0);

    final now = DateTime.now();

    for (int i = 0; i < 12; i++) {
      final monthOffset = i - 11;
      final monthStart = DateTime(now.year, now.month + monthOffset, 1);
      final monthEnd = DateTime(
        now.year,
        now.month + monthOffset + 1,
        0,
        23,
        59,
        59,
      );

      for (final p in _products) {
        for (final tx in p.history) {
          final type = tx['type'];
          final dateStr = tx['date'];
          if (type == 'buy' && dateStr != null) {
            final date = DateTime.parse(dateStr.toString());
            if (date.isAfter(monthStart.subtract(const Duration(seconds: 1))) &&
                date.isBefore(monthEnd.add(const Duration(seconds: 1)))) {
              final amount = (tx['totalAmount'] as num?)?.toDouble() ?? 0.0;
              months[i] += amount;
            }
          }
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
    String unit = 'Kg',
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
      unit: unit,
    );
  }
}

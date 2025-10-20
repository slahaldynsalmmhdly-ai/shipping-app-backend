# Explore API Documentation

## Overview
This document describes the Explore API endpoints for the shipping app. These endpoints allow users to discover and search for companies in the platform.

## Base URL
```
/api/v1/explore
```

## Endpoints

### 1. Get Companies (with Search and Filters)

**Endpoint:** `GET /api/v1/explore/companies`

**Description:** Retrieve a list of companies with optional search and filtering capabilities.

**Access:** Public

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | String | No | Search term to filter companies by name, description, or city |
| `city` | String | No | Filter companies by city |
| `truckType` | String | No | Filter companies by truck type (e.g., "تريلا", "دينا", "سطحة") |
| `sortBy` | String | No | Sort results by: `rating`, `reviews`, `trucks`, or `newest` |
| `page` | Number | No | Page number for pagination (default: 1) |
| `limit` | Number | No | Number of results per page (default: 20) |

**Example Request:**
```
GET /api/v1/explore/companies?search=نقل&city=الرياض&sortBy=rating&page=1&limit=10
```

**Response:**
```json
{
  "companies": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "شركة النقل السريع",
      "companyName": "شركة النقل السريع",
      "email": "info@fastshipping.com",
      "userType": "company",
      "avatar": "https://example.com/avatar.jpg",
      "coverImage": "https://example.com/cover.jpg",
      "phone": "+966501234567",
      "description": "شركة متخصصة في نقل البضائع على مستوى المملكة",
      "address": "شارع الملك فهد، الرياض",
      "city": "الرياض",
      "truckCount": 25,
      "truckTypes": "تريلا، دينا، سطحة",
      "registrationNumber": "12345678",
      "fleetImages": [
        "https://example.com/truck1.jpg",
        "https://example.com/truck2.jpg"
      ],
      "reviewCount": 45,
      "averageRating": 4.5,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-10-20T08:15:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCompanies": 48,
    "hasMore": true
  }
}
```

---

### 2. Get Featured Companies

**Endpoint:** `GET /api/v1/explore/companies/featured`

**Description:** Retrieve a list of top-rated featured companies (maximum 6).

**Access:** Public

**Query Parameters:** None

**Example Request:**
```
GET /api/v1/explore/companies/featured
```

**Response:**
```json
{
  "companies": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "شركة النقل الممتاز",
      "companyName": "شركة النقل الممتاز",
      "email": "info@premium.com",
      "userType": "company",
      "avatar": "https://example.com/avatar.jpg",
      "city": "جدة",
      "truckCount": 50,
      "truckTypes": "تريلا، براد",
      "reviewCount": 120,
      "averageRating": 4.8,
      "description": "أفضل شركة نقل في المنطقة الغربية"
    }
  ]
}
```

---

### 3. Get Available Cities

**Endpoint:** `GET /api/v1/explore/cities`

**Description:** Retrieve a list of all cities where companies are located (for filter dropdown).

**Access:** Public

**Query Parameters:** None

**Example Request:**
```
GET /api/v1/explore/cities
```

**Response:**
```json
{
  "cities": [
    "الرياض",
    "جدة",
    "الدمام",
    "مكة المكرمة",
    "المدينة المنورة",
    "الخبر",
    "الطائف"
  ]
}
```

---

### 4. Get Available Truck Types

**Endpoint:** `GET /api/v1/explore/truck-types`

**Description:** Retrieve a list of all available truck types from companies (for filter dropdown).

**Access:** Public

**Query Parameters:** None

**Example Request:**
```
GET /api/v1/explore/truck-types
```

**Response:**
```json
{
  "truckTypes": [
    "تريلا",
    "دينا",
    "سطحة",
    "براد",
    "نقل أثاث",
    "شاحنة صغيرة"
  ]
}
```

---

## Usage Examples

### Frontend Integration

#### 1. Fetch Companies with Search
```javascript
const fetchCompanies = async (searchTerm, filters) => {
  const params = new URLSearchParams({
    search: searchTerm,
    city: filters.city || '',
    truckType: filters.truckType || '',
    sortBy: filters.sortBy || 'rating',
    page: filters.page || 1,
    limit: 20
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/explore/companies?${params}`);
  const data = await response.json();
  return data;
};
```

#### 2. Fetch Featured Companies
```javascript
const fetchFeaturedCompanies = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/explore/companies/featured`);
  const data = await response.json();
  return data.companies;
};
```

#### 3. Fetch Filter Options
```javascript
const fetchFilterOptions = async () => {
  const [citiesRes, truckTypesRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/v1/explore/cities`),
    fetch(`${API_BASE_URL}/api/v1/explore/truck-types`)
  ]);

  const cities = await citiesRes.json();
  const truckTypes = await truckTypesRes.json();

  return {
    cities: cities.cities,
    truckTypes: truckTypes.truckTypes
  };
};
```

---

## Notes

1. **Search Functionality**: The search parameter searches across company name, description, and city fields using case-insensitive regex matching.

2. **Sorting Options**:
   - `rating`: Sort by average rating (highest first)
   - `reviews`: Sort by number of reviews (most first)
   - `trucks`: Sort by truck count (most first)
   - `newest`: Sort by creation date (newest first)

3. **Pagination**: The API supports pagination with default values of page=1 and limit=20. The response includes pagination metadata to help with infinite scrolling or page navigation.

4. **Review Integration**: Each company object includes `reviewCount` and `averageRating` calculated from the Review collection.

5. **Featured Companies**: Only companies with at least one review are included in the featured list, sorted by rating and review count.

6. **Filter Options**: The cities and truck-types endpoints provide dynamic filter options based on actual data in the database.

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `500 Internal Server Error`: Server error

Example error response:
```json
{
  "message": "Server Error"
}
```


{
	"info": {
		"_postman_id": "35462907-c1d1-480f-93bf-469e8f0652a7",
		"name": "RideDB",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "50098094",
		"_collection_link": "https://arifzikrymail-2549655.postman.co/workspace/Arif-Zikry-Khairol-Anuar's-Work~b85b9692-d194-486c-8ada-c2dbcf79f0a8/collection/50098094-35462907-c1d1-480f-93bf-469e8f0652a7?action=share&source=collection_link&creator=50098094"
	},
	"item": [
		{
			"name": "Create User",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Arman\",\r\n    \"age\" : 65,\r\n    \"userID\" : 1234,\r\n    \"ridesDone\" : 1\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/users",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"users"
					]
				}
			},
			"response": []
		},
		{
			"name": "Find All Users",
			"request": {
				"method": "GET",
				"header": [],
				"url": {
					"raw": "localhost:3000/users",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"users"
					]
				}
			},
			"response": []
		},
		{
			"name": "Update User",
			"request": {
				"method": "PATCH",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Arman Khan\"\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/users/6943786b9769a5fa0e2a66c4",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"users",
						"6943786b9769a5fa0e2a66c4"
					]
				}
			},
			"response": []
		},
		{
			"name": "Delete User",
			"request": {
				"method": "DELETE",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Arman Khan\"\r\n}"
				},
				"url": {
					"raw": "localhost:3000/users/6943786b9769a5fa0e2a66c4",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"users",
						"6943786b9769a5fa0e2a66c4"
					]
				}
			},
			"response": []
		},
		{
			"name": "Create Driver",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Ching\",\r\n    \"age\" : 65,\r\n    \"driverID\" : 1234,\r\n    \"ridesDone\" : 1\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/drivers",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"drivers"
					]
				}
			},
			"response": []
		},
		{
			"name": "Find All Drivers",
			"request": {
				"method": "GET",
				"header": [],
				"url": {
					"raw": "localhost:3000/drivers",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"drivers"
					]
				}
			},
			"response": []
		},
		{
			"name": "Update User",
			"request": {
				"method": "PATCH",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Ching Chong\"\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/drivers/69437add9769a5fa0e2a66c5",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"drivers",
						"69437add9769a5fa0e2a66c5"
					]
				}
			},
			"response": []
		},
		{
			"name": "Delete Driver",
			"request": {
				"method": "DELETE",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Arman Khan\"\r\n}"
				},
				"url": {
					"raw": "localhost:3000/drivers/69437add9769a5fa0e2a66c5",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"drivers",
						"69437add9769a5fa0e2a66c5"
					]
				}
			},
			"response": []
		},
		{
			"name": "Create Ride",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"destination\" : \"Batu Berendam\",\r\n    \"destinationG\" : \"2.255143386024703, 102.25153611316915\",\r\n    \"pickup\" : \"UTeM\",\r\n    \"pickupG\" : \"2.3116305049283263, 102.31832946969536\",\r\n    \"riderID\" : 1234,\r\n    \"driverID\" : 1234,\r\n    \"rideID\" : 1\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/rides",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides"
					]
				}
			},
			"response": []
		},
		{
			"name": "Find All Rides",
			"request": {
				"method": "GET",
				"header": [],
				"url": {
					"raw": "localhost:3000/rides",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides"
					]
				}
			},
			"response": []
		},
		{
			"name": "Update Rides",
			"request": {
				"method": "PATCH",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"rideID\" : 2\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/rides/69437bf19769a5fa0e2a66c6",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides",
						"69437bf19769a5fa0e2a66c6"
					]
				}
			},
			"response": []
		},
		{
			"name": "Delete Rides",
			"request": {
				"method": "DELETE",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"name\" : \"Arman Khan\"\r\n}"
				},
				"url": {
					"raw": "localhost:3000/rides/69437bf19769a5fa0e2a66c6",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides",
						"69437bf19769a5fa0e2a66c6"
					]
				}
			},
			"response": []
		},
		{
			"name": "Create Transaction",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"userID\" : 1234,\r\n    \"driverID\" : 1234,\r\n    \"amount\" : 123.35,\r\n    \"status\" : \"pending\"\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/transactions",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"transactions"
					]
				}
			},
			"response": []
		},
		{
			"name": "Find All Transactions",
			"request": {
				"method": "GET",
				"header": [],
				"url": {
					"raw": "localhost:3000/rides",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides"
					]
				}
			},
			"response": []
		},
		{
			"name": "Update Transaction",
			"request": {
				"method": "PATCH",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"rideID\" : 2\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/rides/69437bf19769a5fa0e2a66c6",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"rides",
						"69437bf19769a5fa0e2a66c6"
					]
				}
			},
			"response": []
		},
		{
			"name": "Login",
			"request": {
				"method": "POST",
				"header": [],
				"body": {
					"mode": "raw",
					"raw": "{\r\n    \"email\": \"arifzikry@gmail.com\",\r\n    \"password\": \"1234\"\r\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "localhost:3000/auth/login",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"auth",
						"login"
					]
				}
			},
			"response": []
		},
		{
			"name": "Delete Admin",
			"request": {
				"method": "DELETE",
				"header": [
					{
						"key": "Authorization",
						"value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTVmMmYzMjVlOGQ4MmIxNTY4NTNjZGQiLCJyb2xlIjoidXNlciIsImlhdCI6MTc2Nzg0NzgwOCwiZXhwIjoxNzY3ODUxNDA4fQ.pkhMpre7jiN75ZOkHX34Ong2HVGBDaVBzfj8IajfMpI",
						"type": "text"
					}
				],
				"body": {
					"mode": "raw",
					"raw": ""
				},
				"url": {
					"raw": "localhost:3000/admin/users/123",
					"host": [
						"localhost"
					],
					"port": "3000",
					"path": [
						"admin",
						"users",
						"123"
					]
				}
			},
			"response": []
		}
	]
}
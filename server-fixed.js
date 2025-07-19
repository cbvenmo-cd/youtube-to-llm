// YouTube Video Analyzer - Main Server
// This file will contain all the Express server logic, API endpoints, and integrations

const dns = require('dns');
// Force IPv4 resolution for Supabase compatibility
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const prisma = new PrismaClient();
const execAsync = promisify(exec);
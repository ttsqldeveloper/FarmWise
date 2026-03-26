import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import io from 'socket.io-client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Calendar, Droplet, Bug, Thermometer, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { token, user } = useAuth();
  const [advice, setAdvice] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [adviceRes, remindersRes] = await Promise.all([
        axios.get('/api/advice/personalized', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/reminders/upcoming', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAdvice(adviceRes.data.advice);
      setReminders(remindersRes.data.reminders);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 mb-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 🌱</h1>
        <p className="text-green-100">Your personalized farming advisor is ready to help you grow.</p>
      </div>

      {/* Seasonal Alert */}
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg mb-8">
        <div className="flex items-center">
          <AlertCircle className="text-yellow-600 mr-3" />
          <div>
            <h3 className="font-semibold text-yellow-800">Seasonal Alert</h3>
            <p className="text-yellow-700">Dry season approaching in 2 weeks. Start preparing your water conservation systems.</p>
          </div>
        </div>
      </div>

      {/* Advice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Droplet className="text-blue-500 mr-2" size={24} />
            Personalized Tips
          </h2>
          <div className="space-y-4">
            {advice.slice(0, 4).map((tip, idx) => (
              <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="font-semibold text-gray-800">{tip.title}</h3>
                <p className="text-gray-600 text-sm">{tip.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Calendar className="text-green-500 mr-2" size={24} />
            Upcoming Reminders
          </h2>
          <div className="space-y-3">
            {reminders.slice(0, 4).map((reminder, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-gray-500">{reminder.due_date}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  reminder.priority === 'high' ? 'bg-red-100 text-red-700' :
                  reminder.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {reminder.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Guides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <Bug className="text-green-600 mb-3" size={28} />
          <h3 className="font-bold mb-2">Pest Control</h3>
          <p className="text-sm text-gray-600">Use neem oil for aphids. Companion planting with marigolds.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <Thermometer className="text-orange-500 mb-3" size={28} />
          <h3 className="font-bold mb-2">Weather Protection</h3>
          <p className="text-sm text-gray-600">Mulch to retain moisture. Provide shade during heat waves.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <Droplet className="text-blue-500 mb-3" size={28} />
          <h3 className="font-bold mb-2">Watering Schedule</h3>
          <p className="text-sm text-gray-600">Water early morning. Deep watering promotes root growth.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
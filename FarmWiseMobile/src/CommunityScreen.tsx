import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
} from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const API_URL = 'http://localhost:3001';

interface Post {
    _id: string;
    title: string;
    content: string;
    user_name: string;
    category: string;
    likes: number;
    comments: any[];
    created_at: string;
}

export default function CommunityScreen() {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' });

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setPosts(data.posts);
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const createPost = async () => {
        if (!newPost.title || !newPost.content) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/forum/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newPost)
            });
            
            if (response.ok) {
                setModalVisible(false);
                setNewPost({ title: '', content: '', category: 'general' });
                loadPosts();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to create post');
        }
    };

    const likePost = async (postId: string) => {
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${API_URL}/api/forum/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadPosts();
        } catch (error) {
            console.error('Failed to like post:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#48bb78" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🤝 {t('community')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                    <Icon name="add" size={30} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Posts List */}
            <ScrollView style={styles.postsList}>
                {posts.map((post) => (
                    <Card key={post._id} style={styles.postCard}>
                        <Card.Content>
                            <View style={styles.postHeader}>
                                <Text style={styles.userName}>{post.user_name}</Text>
                                <Text style={styles.category}>{post.category}</Text>
                            </View>
                            <Title>{post.title}</Title>
                            <Paragraph>{post.content}</Paragraph>
                            <View style={styles.postFooter}>
                                <TouchableOpacity onPress={() => likePost(post._id)} style={styles.likeBtn}>
                                    <Icon name="thumb-up" size={20} color="#48bb78" />
                                    <Text style={styles.likeCount}>{post.likes}</Text>
                                </TouchableOpacity>
                                <Text style={styles.commentCount}>💬 {post.comments.length}</Text>
                                <Text style={styles.date}>
                                    {new Date(post.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>

            {/* Create Post Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create New Post</Text>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Title"
                            value={newPost.title}
                            onChangeText={(text) => setNewPost({ ...newPost, title: text })}
                        />
                        
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="What's on your mind?"
                            multiline
                            numberOfLines={4}
                            value={newPost.content}
                            onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                        />
                        
                        <View style={styles.modalButtons}>
                            <Button mode="contained" onPress={createPost} style={styles.submitBtn}>
                                Post
                            </Button>
                            <Button mode="outlined" onPress={() => setModalVisible(false)}>
                                Cancel
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#1a4731',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    addBtn: {
        padding: 5,
    },
    postsList: {
        flex: 1,
        padding: 15,
    },
    postCard: {
        marginBottom: 15,
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    userName: {
        fontWeight: 'bold',
        color: '#48bb78',
    },
    category: {
        color: '#718096',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    postFooter: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    likeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    likeCount: {
        marginLeft: 5,
        color: '#2d3748',
    },
    commentCount: {
        marginRight: 20,
        color: '#718096',
    },
    date: {
        marginLeft: 'auto',
        color: '#a0aec0',
        fontSize: 12,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    submitBtn: {
        backgroundColor: '#48bb78',
    },
});
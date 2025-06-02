import { createSlice } from "@reduxjs/toolkit"

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        suggestedUsers: [],
        userProfile: null,
        selectedUser: null,
    },
    reducers: {
        setAuthUser: (state, action) => {
            state.user = action.payload;
        },
        setSuggestedUsers: (state, action) => {
            state.suggestedUsers = action.payload;
        },
        setUserProfile: (state, action) => {
            state.userProfile = action.payload;
        },
        setSelectedUser: (state, action) => {
            state.selectedUser = action.payload;
        },
        // New reducer for follow/unfollow actions
        updateFollowStatus: (state, action) => {
            const { userId, actionType } = action.payload;
            
            // Update current user's following list
            if (state.user) {
                if (actionType === 'follow') {
                    if (!state.user.following.includes(userId)) {
                        state.user.following.push(userId);
                    }
                } else if (actionType === 'unfollow') {
                    state.user.following = state.user.following.filter(id => id !== userId);
                }
            }
            
            // Update suggested users
            state.suggestedUsers = state.suggestedUsers.map(user => {
                if (user._id === userId) {
                    return {
                        ...user,
                        followers: actionType === 'follow' 
                            ? [...user.followers, state.user._id] 
                            : user.followers.filter(id => id !== state.user._id)
                    };
                }
                return user;
            });
            
            // Update user profile if it's the same user
            if (state.userProfile && state.userProfile._id === userId) {
                state.userProfile.followers = actionType === 'follow'
                    ? [...state.userProfile.followers, state.user._id]
                    : state.userProfile.followers.filter(id => id !== state.user._id);
            }
            
            // Update selected user if it's the same user
            if (state.selectedUser && state.selectedUser._id === userId) {
                state.selectedUser.followers = actionType === 'follow'
                    ? [...state.selectedUser.followers, state.user._id]
                    : state.selectedUser.followers.filter(id => id !== state.user._id);
            }
        }
    }
});

export const {
    setAuthUser, 
    setSuggestedUsers, 
    setUserProfile,
    setSelectedUser,
    updateFollowStatus // Export the new action
} = authSlice.actions;

export default authSlice.reducer;
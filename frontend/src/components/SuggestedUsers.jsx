import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { updateFollowStatus } from '@/redux/authSlice' // Import the new action
import axios from 'axios'
import { toast } from 'sonner'

const SuggestedUsers = () => {
    const { suggestedUsers, user } = useSelector(store => store.auth)
    const dispatch = useDispatch()

    const handleFollow = async (userId) => {
        const isFollowing = user?.following?.includes(userId)
        const actionType = isFollowing ? 'unfollow' : 'follow'
        
        try {
            const res = await axios.post(`/user/followorunfollow/${userId}`, {}, {
                withCredentials: true
            })
            
            if (res.data.success) {
                // Update Redux state
                dispatch(updateFollowStatus({ 
                    userId, 
                    actionType 
                }))
                
                toast.success(res.data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to follow user")
            console.error(error)
        }
    }

    return (
        <div className='my-10'>
            <div className='flex items-center justify-between text-sm'>
                <h1 className='font-semibold text-gray-600'>Suggested for you</h1>
                <span className='font-medium cursor-pointer'>See All</span>
            </div>
            {suggestedUsers.map((suggestedUser) => {
                const isFollowing = user?.following?.includes(suggestedUser._id)
                
                return (
                    <div key={suggestedUser._id} className='flex items-center justify-between my-5'>
                        <div className='flex items-center gap-2'>
                            <Link to={`/profile/${suggestedUser?._id}`}>
                                <Avatar>
                                    <AvatarImage src={suggestedUser?.profilePicture} alt="user_avatar" />
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                            </Link>
                            <div>
                                <h1 className='font-semibold text-sm'>
                                    <Link to={`/profile/${suggestedUser?._id}`}>
                                        {suggestedUser?.username}
                                    </Link>
                                </h1>
                                <span className='text-gray-600 text-sm'>
                                    {suggestedUser?.bio || 'Bio here...'}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleFollow(suggestedUser._id)}
                            className={`text-xs font-bold cursor-pointer px-3 py-1 rounded ${
                                isFollowing 
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
                                    : 'bg-[#3BADF8] text-white hover:bg-[#3495d6]'
                            }`}
                        >
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default SuggestedUsers
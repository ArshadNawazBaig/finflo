import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

interface Member {
  _id: string;
  name: string;
  email: string;
  memberId: string;
  businessCode: string;
}

interface MemberAuthContextType {
  member: Member | null;
  loading: boolean;
  memberLogin: (token: string, memberData: Member) => Promise<void>;
  memberLogout: () => Promise<void>;
}

export const MemberAuthContext = createContext<MemberAuthContextType>({
  member: null,
  loading: true,
  memberLogin: async () => {},
  memberLogout: async () => {},
});

export const MemberAuthProvider = ({ children }: { children: ReactNode }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMember();
  }, []);

  const loadMember = async () => {
    try {
      const storedMember = await AsyncStorage.getItem('member');
      const memberToken = await AsyncStorage.getItem('member_token');

      if (storedMember && memberToken) {
        setMember(JSON.parse(storedMember));
      }
    } catch (error) {
      console.error('Failed to load member data:', error);
    } finally {
      setLoading(false);
    }
  };

  const memberLogin = async (token: string, memberData: Member) => {
    try {
      await AsyncStorage.setItem('member_token', token);
      await AsyncStorage.setItem('member', JSON.stringify(memberData));
      setMember(memberData);
    } catch (error) {
      console.error('Failed to save member data:', error);
    }
  };

  const memberLogout = async () => {
    try {
      await AsyncStorage.removeItem('member_token');
      await AsyncStorage.removeItem('member');
      setMember(null);
    } catch (error) {
      console.error('Failed to clear member data:', error);
    }
  };

  return (
    <MemberAuthContext.Provider
      value={{ member, loading, memberLogin, memberLogout }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
};

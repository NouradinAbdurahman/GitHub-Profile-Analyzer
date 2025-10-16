declare module '@/components/profile-ai-tools' {
  interface ProfileAIToolsProps {
    user: any;
    onLoginClick: () => void;
  }
  
  export default function ProfileAITools(props: ProfileAIToolsProps): JSX.Element;
} 
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { LoginScreen } from "@/components/login-screen";
import { TodayScreen } from "@/components/today-screen";

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return token ? <TodayScreen /> : <LoginScreen />;
}

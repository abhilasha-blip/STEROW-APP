import { CommonActions, type NavigationProp, type ParamListBase } from '@react-navigation/native';

/** Leave the auth flow for good: replace the root stack with Home (no back to Sign In). */
export function resetToHome(navigation: NavigationProp<ParamListBase>) {
  const root = navigation.getParent() ?? navigation;
  root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
}

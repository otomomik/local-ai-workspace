import { FC } from "react";
import { useModels } from "../hooks/useModels";

const Home: FC = () => {
  const { data } = useModels();
  console.log(data);
  return <div>Home</div>;
};

export default Home;

import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="Nie znaleziono strony"
      subTitle="Strona, której szukasz, nie istnieje lub została przeniesiona."
      extra={[
        <Button type="primary" key="home" onClick={() => navigate('/', { replace: true })}>
          Strona główna
        </Button>,
        <Button key="back" onClick={() => navigate(-1)}>
          Wróć
        </Button>,
      ]}
    />
  );
}

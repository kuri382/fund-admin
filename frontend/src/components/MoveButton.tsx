import React from 'react';
import { Button } from 'antd';
import Link from 'next/link';

const MoveButton: React.FC = () => {

    return (
        <div style={{ padding: '3px' }}>
            <Link href="/sub" passHref>
                <Button type="primary">
                    Sub
                </Button>
            </Link>
            <div style={{ padding: '3px' }}>
            </div>
            <Link href="/signin" passHref>
                <Button type="primary">
                    signin
                </Button>
            </Link>
        </div>
    );
};

export default MoveButton;

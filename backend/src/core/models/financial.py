from enum import Enum


class CategoryIR(Enum):
    FINANCIAL_STATEMENTS = "財務諸表"
    SECURITIES_REPORT = "有価証券報告書"
    QUARTERLY_REPORT = "四半期報告書"
    EARNINGS_REPORT = "決算短信または説明資料"
    TIMELY_DISCLOSURE = "適時開示"
    SHAREHOLDER_NOTICE = "株主総会招集通知および議決権行使資料"
    CORPORATE_GOVERNANCE = "コーポレート・ガバナンス"

type OrderContext = {
    orderInfo: {
        id: number;
        amount: number;
    };
    goToPayment(arg: {
        orderId: number | string;
        paymentIntent: PaymentIntent;
    }): void;
    goToSuccess(): void;
};

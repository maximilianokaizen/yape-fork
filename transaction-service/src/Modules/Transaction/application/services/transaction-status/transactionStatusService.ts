import { Transaction } from "../../../../../Shared/types/transaction";
import { TransactionRepository } from "../../../domain/repositories/TransactionRepository";
import { Logger } from "../../../../../Shared/infrastructure/Logger";
import KafkaProducerService from "../../../../../Shared/infrastructure/kafka/sendMessage";

export class TransactionStatus {   
    private transactionRepository: TransactionRepository;
    private logger: Logger;
    private kafkaProducer: KafkaProducerService; 

    constructor(transactionRepository: TransactionRepository, logger: Logger, kafkaProducer: KafkaProducerService) {
        this.transactionRepository = transactionRepository;
        this.logger = logger;
        this.kafkaProducer = kafkaProducer; 
    }

    async newTransactionEvent(payload: Transaction, topic? : string, groupId? : string) {
        const createdTransaction = await this.transactionRepository.createTransaction(payload);
        if (createdTransaction.success === true) {
            this.logger.debug(`Result: ${JSON.stringify(createdTransaction, null, 2)}`);
            try {
                const transactionData = {
                    transactionExternalId: createdTransaction.data.uuid,
                    transactionType: {
                        name: 'Transaction Created' 
                    },
                    transactionStatus: {
                        name: createdTransaction.data.status
                    },
                    value: createdTransaction.data.value,
                    createdAt: new Date(createdTransaction.data.createdAt)
                };

                const kafkaMessage = {
                    event: "TransactionCreated",
                    data: transactionData,
                };

                this.logger.debug('Sending transaction creation event to Kafka topic.');
                await this.kafkaProducer.sendToKafkaService(kafkaMessage);
            } catch (error) {
                this.logger.error(`Error sending message to Kafka topic: ${error}`);
            }
        } else {
            this.logger.debug('Transaction creation failed, not sending event to Kafka.');
        }
    }
}
